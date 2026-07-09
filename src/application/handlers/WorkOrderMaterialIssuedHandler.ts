import { EventHandler } from '@/infrastructure/event-bus/EventBus';
import { WorkOrderMaterialIssuedEvent } from '@/domain/production/events/WorkOrderEvents';
import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';

/**
 * 处理工单领料事件：扣减库存
 * - inv_inventory.quantity / available_qty 减少
 * - inv_inventory_batch.available_qty / quantity 减少
 * - inv_inventory_transaction 记录出库流水
 */
export class WorkOrderMaterialIssuedHandler implements EventHandler<WorkOrderMaterialIssuedEvent> {
  async handle(event: WorkOrderMaterialIssuedEvent): Promise<void> {
    const { workOrderId, workOrderNo, issuedItems } = event.payload;

    if (!issuedItems || issuedItems.length === 0) return;

    await transaction(async (conn) => {
      for (const item of issuedItems) {
        const [invRows]: any = await conn.execute(
          `SELECT id, quantity, available_qty
           FROM inv_inventory
           WHERE material_id = ? AND warehouse_id = ?
           FOR UPDATE`,
          [item.materialId, item.warehouseId]
        );

        if (invRows.length === 0) {
          secureLog('warn', '领料失败：库存记录不存在，跳过', {
            workOrderNo,
            materialId: item.materialId,
            warehouseId: item.warehouseId,
          });
          continue;
        }

        const inv = invRows[0];
        const currentQty = Number(inv.quantity || 0);
        const _currentAvail = Number(inv.available_qty || 0);

        if (currentQty < item.quantity) {
          throw new Error(
            `物料${item.materialName}库存不足: 当前${currentQty}, 需领${item.quantity}`
          );
        }

        await conn.execute(
          `UPDATE inv_inventory
           SET quantity = quantity - ?, available_qty = available_qty - ?, update_time = NOW()
           WHERE id = ?`,
          [item.quantity, item.quantity, inv.id]
        );

        if (item.batchNo) {
          const [batchRows]: any = await conn.execute(
            `SELECT id, available_qty, quantity
             FROM inv_inventory_batch
             WHERE batch_no = ? AND material_id = ? AND warehouse_id = ?
             FOR UPDATE`,
            [item.batchNo, item.materialId, item.warehouseId]
          );

          if (batchRows.length > 0) {
            const batch = batchRows[0];
            const newAvail = Number(batch.available_qty || 0) - item.quantity;
            const newQty = Number(batch.quantity || 0) - item.quantity;

            if (newAvail <= 0 || newQty <= 0) {
              await conn.execute(
                `UPDATE inv_inventory_batch SET available_qty = 0, quantity = 0, status = 3, update_time = NOW() WHERE id = ?`,
                [batch.id]
              );
            } else {
              await conn.execute(
                `UPDATE inv_inventory_batch SET available_qty = available_qty - ?, quantity = quantity - ?, update_time = NOW() WHERE id = ?`,
                [item.quantity, item.quantity, batch.id]
              );
            }
          }
        }

        const transNo = 'TRX' + Date.now() + String(item.materialId).slice(-4);
        await conn.execute(
          `INSERT INTO inv_inventory_transaction
             (trans_no, trans_type, source_type, source_id, material_id, material_code, batch_no, warehouse_id, quantity, create_time)
           VALUES (?, 'out', 'material_issue', ?, ?, ?, ?, ?, ?, NOW())`,
          [
            transNo,
            workOrderId,
            item.materialId,
            item.materialCode,
            item.batchNo || '',
            item.warehouseId,
            -item.quantity,
          ]
        );
      }
    });

    secureLog('info', '工单领料库存扣减完成', {
      workOrderNo,
      workOrderId,
      itemCount: issuedItems.length,
    });
  }
}
