import { getTranslations } from 'next-intl/server';

import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { SalesOrderShippedEvent } from '@/domain/sales/events/SalesOrderEvents';
import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import { appendInventoryTransaction, recomputeInventorySummary } from '@/lib/inventory-ledger';

export class SalesShippedHandler implements EventHandler<SalesOrderShippedEvent> {
  async handle(event: SalesOrderShippedEvent): Promise<void> {
    const { orderId, orderNo, shippedItems } = event.payload;

    await transaction(async (conn) => {
  const ts = await getTranslations('Common');
      for (const item of shippedItems) {
        const [existingInv] = await conn.execute(
          'SELECT id, quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
          [item.materialId, item.warehouseId]
        );

        if (existingInv.length > 0) {
          const currentQty = parseFloat(existingInv[0].quantity);
          if (currentQty < item.quantity) {
            throw new Error(
              `物料${item.materialName}库存不足: 当前${currentQty}, 需要出库${item.quantity}`
            );
          }
          await conn.execute(
            'UPDATE inv_inventory SET quantity = quantity - ?, update_time = NOW() WHERE id = ?',
            [item.quantity, existingInv[0].id]
          );
        }

        const [existingBatch] = await conn.execute(
          'SELECT id, available_qty, quantity FROM inv_inventory_batch WHERE batch_no = ? AND material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
          [item.batchNo, item.materialId, item.warehouseId]
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

        // 批次明细已扣减：派生重算汇总表，修正漏改 available_qty 的漂移。
        await recomputeInventorySummary(conn, item.materialId, item.warehouseId);

        // 财务级库存流水（'out' 销售出库），与批次扣减同事务，失败整体回滚。
        await appendInventoryTransaction(conn, {
          transType: 'out',
          sourceType: 'sales',
          sourceId: orderId,
          materialId: item.materialId,
          batchNo: item.batchNo || null,
          warehouseId: item.warehouseId,
          quantity: item.quantity,
          unitPrice: item.unitPrice || 0,
          totalAmount: (item.unitPrice || 0) * item.quantity,
          referenceNo: orderNo,
          remark: `销售出库: ${item.materialName || ''}`,
          createBy: null,
          accountDr: ts('k_1vuoc0f'),
          accountCr: ts('k_1gi7g6x'),
        });
      }
    });

    secureLog('info', 'Inventory deducted for sales shipment', {
      orderNo,
      itemCount: shippedItems.length,
    });
  }
}
