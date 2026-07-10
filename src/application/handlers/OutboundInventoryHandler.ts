import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { OutboundOrderApprovedEvent } from '@/domain/warehouse/events/OutboundOrderEvents';
import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';

export class OutboundInventoryHandler implements EventHandler<OutboundOrderApprovedEvent> {
  async handle(event: OutboundOrderApprovedEvent): Promise<void> {
    const { outboundId, outboundNo, warehouseId, items } = event.payload;

    await transaction(async (conn) => {
      for (const item of items) {
        const [existingInv]: Loose = await conn.execute(
          'SELECT id, quantity, available_qty FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
          [item.materialId, warehouseId]
        );

        if (existingInv.length > 0) {
          const currentQty = parseFloat(existingInv[0].quantity);
          if (currentQty < item.quantity) {
            throw new Error(
              `物料${item.materialName}库存不足: 当前${currentQty}, 需要出库${item.quantity}`
            );
          }
          await conn.execute(
            'UPDATE inv_inventory SET quantity = quantity - ?, available_qty = available_qty - ?, update_time = NOW() WHERE id = ?',
            [item.quantity, item.quantity, existingInv[0].id]
          );
        }

        const [existingBatch]: Loose = await conn.execute(
          'SELECT id, available_qty, quantity FROM inv_inventory_batch WHERE batch_no = ? AND material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
          [item.batchNo, item.materialId, warehouseId]
        );

        if (existingBatch.length > 0) {
          const newAvailableQty = parseFloat(existingBatch[0].available_qty) - item.quantity;
          const newQty = parseFloat(existingBatch[0].quantity) - item.quantity;
          if (newAvailableQty <= 0 || newQty <= 0) {
            await conn.execute(
              'UPDATE inv_inventory_batch SET deleted = 1, update_time = NOW() WHERE id = ?',
              [existingBatch[0].id]
            );
          } else {
            await conn.execute(
              'UPDATE inv_inventory_batch SET available_qty = available_qty - ?, quantity = quantity - ?, update_time = NOW() WHERE id = ?',
              [item.quantity, item.quantity, existingBatch[0].id]
            );
          }
        }

        const transNo = 'TRX' + Date.now() + String(item.materialId).slice(-4);
        await conn.execute(
          `INSERT INTO inv_inventory_transaction (trans_no, trans_type, source_type, source_id, material_id, material_code, batch_no, warehouse_id, quantity, unit_price, total_amount, create_time)
           VALUES (?, 'out', 'outbound', ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            transNo,
            outboundId,
            item.materialId,
            item.materialCode,
            item.batchNo,
            warehouseId,
            item.quantity,
            item.unitPrice,
            item.quantity * item.unitPrice,
          ]
        );
      }
    });

    secureLog('info', 'Inventory deducted for outbound order', {
      outboundNo,
      itemCount: items.length,
    });
  }
}
