import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { DeliveryCancelledEvent } from '@/domain/sales/events/DeliveryEvents';
import { transaction } from '@/lib/db';
import { logger, secureLog } from '@/lib/logger';
import type { RowDataPacket } from 'mysql2';

interface DeliveryDetailRow {
  id: number;
  order_detail_id: number | null;
  quantity: number;
  material_id: number;
}

export class DeliveryCancelledHandler implements EventHandler<DeliveryCancelledEvent> {
  async handle(event: DeliveryCancelledEvent): Promise<void> {
    const { deliveryId, deliveryNo, orderId, reason } = event.payload;
    const ctx = { module: 'delivery-cancelled', action: 'rollback', deliveryId, deliveryNo };
    let phase = 'init';

    try {
      await transaction(async (conn) => {
        phase = 'load_delivery_details';
        const [detailRows] = await conn.execute<RowDataPacket[]>(
          'SELECT id, order_detail_id, quantity, material_id FROM sal_delivery_detail WHERE delivery_id = ? AND deleted = 0',
          [deliveryId]
        );

        if (!detailRows || detailRows.length === 0) {
          logger.warn(ctx, '发货单明细不存在，跳过回滚', { deliveryId, deliveryNo });
          return;
        }

        const details = detailRows as unknown as DeliveryDetailRow[];
        logger.info(ctx, '发货单明细加载完成', {
          deliveryId,
          detailCount: details.length,
        });

        phase = 'rollback_delivered_qty';
        for (const detail of details) {
          if (detail.order_detail_id) {
            await conn.execute(
              'UPDATE sal_order_detail SET delivered_qty = GREATEST(0, delivered_qty - ?) WHERE id = ?',
              [detail.quantity, detail.order_detail_id]
            );
            logger.info(ctx, '回滚订单明细已发货数量', {
              orderDetailId: detail.order_detail_id,
              rollbackQty: detail.quantity,
            });
          }
        }

        phase = 'check_order_status';
        if (orderId) {
          const [orderStatusRows] = await conn.execute<RowDataPacket[]>(
            'SELECT id, status FROM sal_order WHERE id = ?',
            [orderId]
          );

          if (orderStatusRows && orderStatusRows.length > 0) {
            const currentStatus = orderStatusRows[0].status;
            if (currentStatus === 3 || currentStatus === 4) {
              const [totalDelivered] = await conn.execute<RowDataPacket[]>(
                `SELECT SUM(delivered_qty) as total_delivered
                 FROM sal_order_detail
                 WHERE order_id = ? AND deleted = 0`,
                [orderId]
              );

              const totalDeliveredQty = Number(totalDelivered[0]?.total_delivered || 0);
              if (totalDeliveredQty === 0) {
                await conn.execute(
                  'UPDATE sal_order SET status = 2, update_time = NOW() WHERE id = ?',
                  [orderId]
                );
                logger.info(ctx, '订单状态恢复为已审核', { orderId });
              } else {
                await conn.execute(
                  'UPDATE sal_order SET status = 3, update_time = NOW() WHERE id = ?',
                  [orderId]
                );
                logger.info(ctx, '订单状态恢复为部分发货', { orderId });
              }
            }
          }
        }
      });

      secureLog('info', 'Delivery cancelled and order quantities rolled back', {
        deliveryNo,
        orderId,
        reason,
      });
    } catch (err) {
      logger.error(ctx, `DeliveryCancelled 失败 [phase=${phase}]`, {
        error: err instanceof Error ? err.message : String(err),
        deliveryNo,
        orderId,
      });
      throw err;
    }
  }
}
