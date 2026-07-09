import { EventHandler } from '@/infrastructure/event-bus/EventBus';
import { WorkOrderCompletedEvent } from '@/domain/production/events/WorkOrderEvents';
import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';

/**
 * 处理工单完工事件：成品入库（增加库存）
 * - inv_inventory.quantity / available_qty 增加（不存在则创建）
 * - inv_inventory_batch 创建新批次
 * - inv_inventory_transaction 记录入库流水
 */
export class WorkOrderCompletedHandler implements EventHandler<WorkOrderCompletedEvent> {
  async handle(event: WorkOrderCompletedEvent): Promise<void> {
    const { workOrderId, workOrderNo, productId, productName, completedQty, warehouseId } =
      event.payload;

    if (completedQty <= 0) return;

    const batchNo = `WO${workOrderNo}${Date.now().toString().slice(-6)}`;
    const today = new Date().toISOString().slice(0, 10);

    await transaction(async (conn) => {
      const [invRows]: any = await conn.execute(
        `SELECT id, quantity, available_qty, unit
         FROM inv_inventory
         WHERE material_id = ? AND warehouse_id = ?
         FOR UPDATE`,
        [productId, warehouseId]
      );

      let materialCode = '';
      let unit = '件';

      const [matRows]: any = await conn.execute(
        `SELECT material_code, unit FROM inv_material WHERE id = ?`,
        [productId]
      );
      if (matRows.length > 0) {
        materialCode = matRows[0].material_code || '';
        unit = matRows[0].unit || '件';
      }

      if (invRows.length > 0) {
        const inv = invRows[0];
        await conn.execute(
          `UPDATE inv_inventory
           SET quantity = quantity + ?, available_qty = available_qty + ?, update_time = NOW()
           WHERE id = ?`,
          [completedQty, completedQty, inv.id]
        );
        unit = inv.unit || unit;
      } else {
        await conn.execute(
          `INSERT INTO inv_inventory
             (material_id, material_code, material_name, warehouse_id, quantity, available_qty, unit, create_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [productId, materialCode, productName, warehouseId, completedQty, completedQty, unit]
        );
      }

      await conn.execute(
        `INSERT INTO inv_inventory_batch
           (material_id, material_name, batch_no, quantity, available_qty, warehouse_id, inbound_date, status, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
        [productId, productName, batchNo, completedQty, completedQty, warehouseId, today]
      );

      const transNo = 'TRX' + Date.now() + String(productId).slice(-4);
      await conn.execute(
        `INSERT INTO inv_inventory_transaction
           (trans_no, trans_type, source_type, source_id, material_id, material_code, batch_no, warehouse_id, quantity, create_time)
         VALUES (?, 'in', 'workorder_completion', ?, ?, ?, ?, ?, ?, NOW())`,
        [transNo, workOrderId, productId, materialCode, batchNo, warehouseId, completedQty]
      );
    });

    secureLog('info', '工单完工入库完成', {
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
