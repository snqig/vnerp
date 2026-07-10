import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { MaterialReturnApprovedEvent } from '@/domain/production/events/PickOrderEvents';
import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';

export class MaterialReturnInventoryHandler implements EventHandler<MaterialReturnApprovedEvent> {
  async handle(event: MaterialReturnApprovedEvent): Promise<void> {
    const { returnId, returnNo, warehouseId, items } = event.payload;

    await transaction(async (conn) => {
      for (const item of items) {
        const [existingInv]: Loose = await conn.execute(
          'SELECT id, quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
          [item.materialId, warehouseId]
        );

        if (existingInv.length > 0) {
          await conn.execute(
            'UPDATE inv_inventory SET quantity = quantity + ?, available_qty = available_qty + ?, update_time = NOW() WHERE id = ?',
            [item.quantity, item.quantity, existingInv[0].id]
          );
        } else {
          await conn.execute(
            `INSERT INTO inv_inventory (material_id, material_code, material_name, warehouse_id, quantity, available_qty, unit, create_time)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              item.materialId,
              item.materialCode || null,
              item.materialName,
              warehouseId,
              item.quantity,
              item.quantity,
              item.unit || '件',
            ]
          );
        }

        if (item.batchNo) {
          const [existingBatch]: Loose = await conn.execute(
            'SELECT id, available_qty, quantity FROM inv_inventory_batch WHERE batch_no = ? AND material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
            [item.batchNo, item.materialId, warehouseId]
          );

          if (existingBatch.length > 0) {
            await conn.execute(
              'UPDATE inv_inventory_batch SET available_qty = available_qty + ?, quantity = quantity + ?, update_time = NOW() WHERE id = ?',
              [item.quantity, item.quantity, existingBatch[0].id]
            );
          } else {
            await conn.execute(
              `INSERT INTO inv_inventory_batch (batch_no, material_id, material_name, warehouse_id, available_qty, quantity, unit_price, inbound_date, status, create_time)
               VALUES (?, ?, ?, ?, ?, ?, 0, CURDATE(), 1, NOW())`,
              [
                item.batchNo,
                item.materialId,
                item.materialName,
                warehouseId,
                item.quantity,
                item.quantity,
              ]
            );
          }
        }

        const transNo = 'TRX' + Date.now() + String(item.materialId).slice(-4);
        await conn.execute(
          `INSERT INTO inv_inventory_transaction (trans_no, trans_type, source_type, source_id, material_id, material_code, batch_no, warehouse_id, quantity, unit_price, total_amount, create_time)
           VALUES (?, 'in', 'material_return', ?, ?, ?, ?, ?, ?, 0, 0, NOW())`,
          [
            transNo,
            returnId,
            item.materialId,
            item.materialCode,
            item.batchNo,
            warehouseId,
            item.quantity,
          ]
        );
      }
    });

    secureLog('info', 'Inventory increased for material return', {
      returnNo,
      itemCount: items.length,
    });
  }
}
