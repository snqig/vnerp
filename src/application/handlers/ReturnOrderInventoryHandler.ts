import { execute } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import type { DomainEvent } from '@/domain/shared/DomainTypes';

/**
 * 退料单审核后的库存联动处理器
 * 监听：prod.return.approved
 * 功能：增加原材料库存（退库）
 */
export class ReturnOrderInventoryHandler {
  async handle(event: DomainEvent): Promise<void> {
    const { returnOrderId, items } = event.payload as {
      returnOrderId: number;
      items: Array<{
        materialId: number;
        quantity: number;
        batchNo: string;
        warehouseId: number;
      }>;
    };

    secureLog('info', 'ReturnOrderInventoryHandler: processing return order approval', {
      returnOrderId,
      itemCount: items.length,
    });

    for (const item of items) {
      const transNo = `RT${Date.now()}${String(item.materialId).slice(-4)}`;

      const existing = await execute(
        'SELECT id FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0',
        [item.materialId, item.warehouseId]
      );

      if ((existing as any).length > 0) {
        await execute(
          `UPDATE inv_inventory SET quantity = quantity + ?,
           available_qty = available_qty + ?, update_time = NOW()
           WHERE material_id = ? AND warehouse_id = ? AND deleted = 0`,
          [item.quantity, item.quantity, item.materialId, item.warehouseId]
        );
      } else {
        await execute(
          `INSERT INTO inv_inventory
           (material_id, warehouse_id, quantity, available_qty, unit, create_time)
           VALUES (?, ?, ?, ?, '件', NOW())`,
          [item.materialId, item.warehouseId, item.quantity, item.quantity]
        );
      }

      await execute(
        `INSERT INTO inv_inventory_transaction
         (trans_no, trans_type, source_type, source_id, material_id, batch_no, warehouse_id, quantity, create_time)
         VALUES (?, 'in', 'prod_return', ?, ?, ?, ?, ?, NOW())`,
        [transNo, returnOrderId, item.materialId, item.batchNo, item.warehouseId, item.quantity]
      );
    }
  }
}
