import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { InboundOrderUnapprovedEvent } from '@/domain/warehouse/events/InboundOrderEvents';
import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';

export class InventoryRollbackHandler implements EventHandler<InboundOrderUnapprovedEvent> {
  async handle(event: InboundOrderUnapprovedEvent): Promise<void> {
    const { warehouseId, items, orderNo } = event.payload;

    const sortedItems = [...items].sort((a, b) => a.materialId - b.materialId);

    await transaction(async (conn) => {
      for (const item of sortedItems) {
        const [existingInv]: any = await conn.execute(
          'SELECT id, quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
          [item.materialId, warehouseId]
        );

        if (existingInv.length > 0) {
          const newQty = parseFloat(existingInv[0].quantity) - item.quantity;
          if (newQty <= 0) {
            await conn.execute(
              'UPDATE inv_inventory SET quantity = 0, update_time = NOW() WHERE id = ?',
              [existingInv[0].id]
            );
          } else {
            await conn.execute(
              'UPDATE inv_inventory SET quantity = quantity - ?, update_time = NOW() WHERE id = ?',
              [item.quantity, existingInv[0].id]
            );
          }
        }

        const [existingBatch]: any = await conn.execute(
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
      }
    });

    secureLog('info', 'Inventory rolled back for unapproved inbound order', { orderNo, itemCount: items.length });
  }
}
