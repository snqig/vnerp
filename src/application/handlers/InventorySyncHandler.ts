import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { InboundOrderApprovedEvent } from '@/domain/warehouse/events/InboundOrderEvents';
import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import { InventoryCostService } from '@/application/services/InventoryCostService';
import { appendInventoryTransaction, recomputeInventorySummary } from '@/lib/inventory-ledger';
import type { RowDataPacket } from 'mysql2';

/** 库存行类型 */
interface InventoryRow {
  id: number;
  quantity: string | number;
}

/** 库存批次行类型 */
interface InventoryBatchRow {
  id: number;
  available_qty: string | number;
}

const costService = new InventoryCostService();

export class InventorySyncHandler implements EventHandler<InboundOrderApprovedEvent> {
  async handle(event: InboundOrderApprovedEvent): Promise<void> {
    const { inboundId, warehouseId, items, inboundNo } = event.payload;

    const sortedItems = [...items].sort((a, b) => a.materialId - b.materialId);

    await transaction(async (conn) => {
      for (const item of sortedItems) {
        // 汇总表 inv_inventory：用 UPSERT 原子处理「新建 / 已存在累加 / 软删行复活」三种情况，
        // 彻底消除 `Duplicate entry for key uk_material_warehouse` 竞态——
        // 该唯一索引无视 deleted，若已存在软删行，原本的「先 SELECT(deleted=0) 再 INSERT」会撞唯一键导致整单回滚、进死信。
        await conn.execute(
          `INSERT INTO inv_inventory (material_id, material_code, material_name, warehouse_id, quantity, available_qty, unit, deleted, create_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())
           ON DUPLICATE KEY UPDATE
             quantity = quantity + VALUES(quantity),
             available_qty = available_qty + VALUES(available_qty),
             deleted = 0,
             material_code = VALUES(material_code),
             material_name = VALUES(material_name),
             update_time = NOW()`,
          [
            item.materialId,
            item.materialCode || null,
            item.materialName,
            warehouseId,
            item.quantity,
            item.quantity,
            '件',
          ]
        );
        const [invRow] = await conn.execute<RowDataPacket[]>(
          'SELECT id FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
          [item.materialId, warehouseId]
        );
        const invId = (invRow[0] as unknown as InventoryRow).id;
        if (item.unitPrice && item.unitPrice > 0) {
          await costService.onInbound(conn, invId, item.quantity, item.unitPrice);
        }

        const [existingBatch] = await conn.execute<RowDataPacket[]>(
          'SELECT id, available_qty FROM inv_inventory_batch WHERE batch_no = ? AND material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
          [item.batchNo, item.materialId, warehouseId]
        );

        if (existingBatch.length > 0) {
          const batchRow = existingBatch[0] as unknown as InventoryBatchRow;
          await conn.execute(
            'UPDATE inv_inventory_batch SET available_qty = available_qty + ?, quantity = quantity + ?, update_time = NOW() WHERE id = ?',
            [item.quantity, item.quantity, batchRow.id]
          );
        } else {
          await conn.execute(
            `INSERT INTO inv_inventory_batch (batch_no, material_id, material_name, warehouse_id, available_qty, quantity, unit_price, inbound_date, status, produce_date, create_time)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())`,
            [
              item.batchNo,
              item.materialId,
              item.materialName,
              warehouseId,
              item.quantity,
              item.quantity,
              item.unitPrice || 0,
              new Date().toISOString().slice(0, 10),
              null,
            ]
          );
        }

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
