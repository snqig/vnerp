import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { InboundOrderApprovedEvent } from '@/domain/warehouse/events/InboundOrderEvents';
import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';

export class InventorySyncHandler implements EventHandler<InboundOrderApprovedEvent> {
  async handle(event: InboundOrderApprovedEvent): Promise<void> {
    const { warehouseId, items, inboundNo } = event.payload;

    const sortedItems = [...items].sort((a, b) => a.materialId - b.materialId);

    await transaction(async (conn) => {
      for (const item of sortedItems) {
        const [existingInv]: any = await conn.execute(
          'SELECT id, quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
          [item.materialId, warehouseId]
        );

        if (existingInv.length > 0) {
          await conn.execute(
            'UPDATE inv_inventory SET quantity = quantity + ?, update_time = NOW() WHERE id = ?',
            [item.quantity, existingInv[0].id]
          );
        } else {
          await conn.execute(
            `INSERT INTO inv_inventory (material_id, material_code, material_name, warehouse_id, quantity, unit, create_time)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [
              item.materialId,
              item.materialCode || null,
              item.materialName,
              warehouseId,
              item.quantity,
              '件',
            ]
          );
        }

        const [existingBatch]: any = await conn.execute(
          'SELECT id, available_qty FROM inv_inventory_batch WHERE batch_no = ? AND material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
          [item.batchNo, item.materialId, warehouseId]
        );

        if (existingBatch.length > 0) {
          await conn.execute(
            'UPDATE inv_inventory_batch SET available_qty = available_qty + ?, quantity = quantity + ?, update_time = NOW() WHERE id = ?',
            [item.quantity, item.quantity, existingBatch[0].id]
          );
        } else {
          await conn.execute(
            `INSERT INTO inv_inventory_batch (batch_no, material_id, material_code, material_name, warehouse_id, available_qty, quantity, unit_price, inbound_date, status, produce_date, create_time)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())`,
            [
              item.batchNo,
              item.materialId,
              item.materialCode || null,
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
      }
    });

    secureLog('info', 'Inventory synced for inbound order', { orderNo: inboundNo, itemCount: items.length });
  }
}
