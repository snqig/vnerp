import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { DeliveryShippedEvent } from '@/domain/sales/events/DeliveryEvents';
import { transaction } from '@/lib/db';
import { logger, secureLog } from '@/lib/logger';
import type { RowDataPacket } from 'mysql2';

/**
 * 处理 DeliveryShippedEvent：发货出库时扣减库存和批次可用量，记录库存交易流水，
 * 并更新销售订单状态（已审核→部分发货→全部发货）。
 */
export class DeliveryShippedHandler implements EventHandler<DeliveryShippedEvent> {
  async handle(event: DeliveryShippedEvent): Promise<void> {
    const { deliveryId, deliveryNo, orderId, warehouseId, shippedItems } = event.payload;
    const ctx = { module: 'delivery-shipped', action: 'inventory', deliveryId, deliveryNo };

    await transaction(async (conn) => {
      for (const item of shippedItems) {
        const [existingInv]: Loose = await conn.execute(
          'SELECT id, quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
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
            'UPDATE inv_inventory SET quantity = quantity - ?, update_time = NOW() WHERE id = ?',
            [item.quantity, existingInv[0].id]
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
           VALUES (?, 'out', 'sales_delivery', ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            transNo,
            deliveryId,
            item.materialId,
            item.materialCode,
            item.batchNo,
            warehouseId,
            item.quantity,
            item.unitPrice,
            item.quantity * item.unitPrice,
          ]
        );

        if (item.orderDetailId) {
          await conn.execute(
            `UPDATE sal_order_detail SET delivered_qty = delivered_qty + ? WHERE id = ?`,
            [item.quantity, item.orderDetailId]
          );
        }
      }

      if (orderId) {
        const [orderStatusRows] = await conn.execute<RowDataPacket[]>(
          'SELECT id, status FROM sal_order WHERE id = ?',
          [orderId]
        );

        if (orderStatusRows && orderStatusRows.length > 0) {
          const currentStatus = orderStatusRows[0].status;
          if (currentStatus === 2) {
            await conn.execute(
              'UPDATE sal_order SET status = 3, update_time = NOW() WHERE id = ?',
              [orderId]
            );
            logger.info(ctx, '订单状态更新为部分发货', { orderId });
          }

          const [totalDelivered] = await conn.execute<RowDataPacket[]>(
            `SELECT SUM(delivered_qty) as total_delivered
             FROM sal_order_detail
             WHERE order_id = ? AND deleted = 0`,
            [orderId]
          );

          const [orderTotal] = await conn.execute<RowDataPacket[]>(
            `SELECT SUM(quantity) as order_total
             FROM sal_order_detail
             WHERE order_id = ? AND deleted = 0`,
            [orderId]
          );

          const deliveredQty = Number(totalDelivered[0]?.total_delivered || 0);
          const orderTotalQty = Number(orderTotal[0]?.order_total || 0);

          if (deliveredQty >= orderTotalQty && orderTotalQty > 0) {
            await conn.execute(
              'UPDATE sal_order SET status = 4, update_time = NOW() WHERE id = ?',
              [orderId]
            );
            logger.info(ctx, '订单状态更新为全部发货', { orderId });
          }
        }
      }
    });

    secureLog('info', 'Inventory deducted for delivery shipment', {
      deliveryNo,
      orderId,
      itemCount: shippedItems.length,
    });
  }
}
