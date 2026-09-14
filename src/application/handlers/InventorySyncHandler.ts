import { getTranslations } from 'next-intl/server';

import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { InboundOrderApprovedEvent } from '@/domain/warehouse/events/InboundOrderEvents';
import { transactionWithRetry } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import { InventoryCostService } from '@/application/services/InventoryCostService';
import { appendInventoryTransaction, recomputeInventorySummary } from '@/lib/inventory-ledger';
import { upsertInventoryBatch, upsertInventorySummary } from '@/lib/inventory-write';
import type { RowDataPacket } from 'mysql2';

/** 库存行类型 */
interface InventoryRow {
  id: number;
  quantity: string | number;
}

const costService = new InventoryCostService();

export class InventorySyncHandler implements EventHandler<InboundOrderApprovedEvent> {
  async handle(event: InboundOrderApprovedEvent): Promise<void> {
    const { inboundId, warehouseId, items, inboundNo } = event.payload;

    // 按 materialId 升序处理，进一步降低跨物料环等待概率（既有行为，保留）。
    const sortedItems = [...items].sort((a, b) => a.materialId - b.materialId);

    // QA BUG-001 修复（2026-09-14）：
    //  1) 锁序统一为 inv_inventory（汇总行） → inv_inventory_batch（批次行），
    //     与 InventoryRollbackHandler / DeliveryShippedHandler / SalesShippedHandler 等
    //     所有库存写入路径一致，杜绝跨链路环等待。
    //  2) 批次写入一律走 upsertInventoryBatch（UPSERT），不再
    //     「SELECT ... FOR UPDATE 判存在 → INSERT」，从物理上消除
    //     REPEATABLE READ 下「间隙锁 → 插入意向锁」互斥导致的死锁。
    //  3) transactionWithRetry 兜底重试 errno 1213/1205（InnoDB 死锁/锁等待超时）。
    await transactionWithRetry(async (conn) => {
      const ts = await getTranslations('Common');
      for (const item of sortedItems) {
        // 1) 汇总表 inv_inventory：UPSERT 原子处理「新建 / 已存在累加 / 软删行复活」三种情况，
        //    彻底消除 `Duplicate entry for key uk_material_warehouse` 竞态——
        //    该唯一索引无视 deleted，若已存在软删行，原本的「先 SELECT(deleted=0) 再 INSERT」
        //    会撞唯一键导致整单回滚、进死信。
        await upsertInventorySummary(conn, {
          materialId: item.materialId,
          materialCode: item.materialCode || null,
          materialName: item.materialName,
          warehouseId,
          quantity: item.quantity,
          unit: ts('k_w0gthl'),
        });

        // 2) 取汇总行 id（成本核算需要）。UPSERT 已锁定该行，此处为**记录锁**而非间隙锁。
        const [invRow] = await conn.execute<RowDataPacket[]>(
          'SELECT id FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
          [item.materialId, warehouseId]
        );
        const invId = (invRow[0] as unknown as InventoryRow).id;
        if (item.unitPrice && item.unitPrice > 0) {
          await costService.onInbound(conn, invId, item.quantity, item.unitPrice);
        }

        // 3) 批次表 inv_inventory_batch：UPSERT（BUG-001 的关键修复点）。
        await upsertInventoryBatch(conn, {
          batchNo: item.batchNo,
          materialId: item.materialId,
          materialName: item.materialName,
          warehouseId,
          quantity: item.quantity,
          unitPrice: item.unitPrice || 0,
          inboundDate: new Date().toISOString().slice(0, 10),
          status: 1,
        });

        // 批次明细已更新：派生重算汇总表，杜绝双写漂移。
        await recomputeInventorySummary(conn, item.materialId, warehouseId);

        // 财务级库存流水（'in' 入库），与库存变动同事务，失败整体回滚。
        await appendInventoryTransaction(conn, {
          transType: 'in',
          sourceType: 'inbound_order',
          sourceId: inboundId,
          materialId: item.materialId,
          batchNo: item.batchNo || null,
          warehouseId,
          quantity: item.quantity,
          unitPrice: item.unitPrice || 0,
          totalAmount: (item.unitPrice || 0) * item.quantity,
          referenceNo: inboundNo,
          remark: `入库入账: ${item.materialName}`,
          createBy: null,
        });
      }
    });

    secureLog('info', 'Inventory synced for inbound order', {
      orderNo: inboundNo,
      itemCount: items.length,
    });
  }
}
