import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import type { DomainEvent } from '@/domain/shared/DomainTypes';

export class PickOrderInventoryHandler {
  async handle(event: DomainEvent): Promise<void> {
    const { pickOrderId, items } = event.payload as {
      pickOrderId: number;
      items: Array<{
        materialId: number;
        quantity: number;
        batchNo: string;
        warehouseId: number;
      }>;
    };

    secureLog('info', 'PickOrderInventoryHandler: processing pick order approval', {
      pickOrderId,
      itemCount: items.length,
    });

    await transaction(async (conn) => {
      for (const item of items) {
        const transNo = `PK${Date.now()}${String(item.materialId).slice(-4)}`;

        const [result] = await conn.execute<any>(
          `UPDATE inv_inventory SET quantity = GREATEST(quantity - ?, 0),
           available_qty = GREATEST(available_qty - ?, 0), update_time = NOW()
           WHERE material_id = ? AND warehouse_id = ? AND deleted = 0`,
          [item.quantity, item.quantity, item.materialId, item.warehouseId]
        );

        if (result.affectedRows > 0) {
          await conn.execute(
            `INSERT INTO inv_inventory_transaction
             (trans_no, trans_type, source_type, source_id, material_id, batch_no, warehouse_id, quantity, create_time)
             VALUES (?, 'out', 'prod_pick', ?, ?, ?, ?, ?, NOW())`,
            [transNo, pickOrderId, item.materialId, item.batchNo, item.warehouseId, item.quantity]
          );
        }
      }
    });
  }
}
