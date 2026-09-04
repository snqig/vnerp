import { getTranslations } from 'next-intl/server';

import { EventHandler } from '@/infrastructure/event-bus/EventBus';
import { WorkOrderCompletedEvent } from '@/domain/production/events/WorkOrderEvents';
import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import { InventoryCostService } from '@/application/services/InventoryCostService';
import { appendInventoryTransaction, recomputeInventorySummary } from '@/lib/inventory-ledger';

const costService = new InventoryCostService();

/**
 * 处理工单完工事件：成品入库（增加库存）
 * - inv_inventory.quantity / available_qty 增加（不存在则创建）
 * - inv_inventory_batch 创建新批次
 * - inv_inventory_transaction 记录入库流水
 */
export class WorkOrderCompletedHandler implements EventHandler<WorkOrderCompletedEvent> {
  async handle(event: WorkOrderCompletedEvent): Promise<void> {
  const ts = await getTranslations('Common');
    const { workOrderId, workOrderNo, productId, productName, completedQty, warehouseId } =
      event.payload;

    if (completedQty <= 0) return;

    const batchNo = `WO${workOrderNo}${Date.now().toString().slice(-6)}`;
    const today = new Date().toISOString().slice(0, 10);

    await transaction(async (conn) => {
      const [invRows] = await conn.execute(
        `SELECT id, quantity, available_qty, unit
         FROM inv_inventory
         WHERE material_id = ? AND warehouse_id = ?
         FOR UPDATE`,
        [productId, warehouseId]
      ) as any;

      let materialCode = '';
      let unit = ts('k_w0gthl');

      const [matRows] = await conn.execute(
        `SELECT material_code, unit FROM inv_material WHERE id = ?`,
        [productId]
      ) as any;
      if (matRows.length > 0) {
        materialCode = matRows[0].material_code || '';
        unit = matRows[0].unit || ts('k_w0gthl');
      }

      // R4 修复：uk_material_warehouse 唯一键不含 deleted，软删行仍占位。
      // 原「SELECT deleted=0 后 INSERT」遇软删行会撞 Duplicate entry 导致整事务回滚，
      // 改为原子 UPSERT（覆盖 新建 / 累加 / 软删行复活），并用 id = LAST_INSERT_ID(id)
      // 保证 UPSERT 命中更新分支时也能取到正确的行 id。
      if (invRows.length > 0) {
        unit = invRows[0].unit || unit;
      }
      await conn.execute(
        `INSERT INTO inv_inventory
           (material_id, material_code, material_name, warehouse_id, quantity, available_qty, unit, deleted, create_time, update_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           id = LAST_INSERT_ID(id),
           quantity = quantity + VALUES(quantity),
           available_qty = available_qty + VALUES(available_qty),
           material_code = VALUES(material_code),
           material_name = VALUES(material_name),
           deleted = 0,
           update_time = NOW()`,
        [productId, materialCode, productName, warehouseId, completedQty, completedQty, unit]
      );
      const [idRow] = await conn.execute('SELECT LAST_INSERT_ID() AS inv_id');
      const newInvId = (idRow as unknown as Array<{ inv_id: number }>)[0]?.inv_id;
      if (newInvId) {
        await costService.onInbound(conn, newInvId, completedQty, 0);
      }

      await conn.execute(
        `INSERT INTO inv_inventory_batch
           (material_id, material_name, batch_no, quantity, available_qty, warehouse_id, inbound_date, status, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
        [productId, productName, batchNo, completedQty, completedQty, warehouseId, today]
      );

      // 批次明细已新增：派生重算汇总表，杜绝双写漂移。
      await recomputeInventorySummary(conn, productId, warehouseId);

      // 财务级库存流水（'in' 工单完工入库），与批次新增同事务，失败整体回滚。
      await appendInventoryTransaction(conn, {
        transType: 'in',
        sourceType: 'workorder_completion',
        sourceId: workOrderId,
        materialId: productId,
        batchNo: batchNo,
        warehouseId,
        quantity: completedQty,
        unitPrice: 0,
        totalAmount: 0,
        referenceNo: workOrderNo,
        remark: `工单完工入库: ${productName}`,
        createBy: null,
      });
    });

    secureLog('info', ts('k_104mbe4'), {
      workOrderNo,
      workOrderId,
      productId,
      productName,
      completedQty,
      warehouseId,
      batchNo,
    });
  }
}
