import { execute } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import type { DomainEvent } from '@/domain/shared/DomainTypes';

/**
 * 领料单审核后的库存联动处理器
 * 监听：prod.pick.approved
 * 功能：扣减原材料库存
 */
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

    for (const item of items) {
      const transNo = `PK${Date.now()}${String(item.materialId).slice(-4)}`;
      // 扣减库存
      const result = await execute(
        `UPDATE inv_inventory SET quantity = GREATEST(quantity - ?, 0),
         available_qty = GREATEST(available_qty - ?, 0), update_time = NOW()
         WHERE material_id = ? AND warehouse_id = ? AND deleted = 0`,
        [item.quantity, item.quantity, item.materialId, item.warehouseId]
      );

      if ((result as any).affectedRows > 0) {
        await execute(
          `INSERT INTO inv_inventory_transaction
           (trans_no, trans_type, source_type, source_id, material_id, batch_no, warehouse_id, quantity, create_time)
           VALUES (?, 'out', 'prod_pick', ?, ?, ?, ?, ?, NOW())`,
          [transNo, pickOrderId, item.materialId, item.batchNo, item.warehouseId, item.quantity]
        );
      }
    }
  }
}
