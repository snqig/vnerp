import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { DeliveryShippedEvent } from '@/domain/sales/events/DeliveryEvents';
import { transaction } from '@/lib/db';
import { logger, secureLog } from '@/lib/logger';

export class DeliveryReceivableHandler implements EventHandler<DeliveryShippedEvent> {
  async handle(event: DeliveryShippedEvent): Promise<void> {
    const { deliveryId, deliveryNo, orderId, customerId, totalAmount } = event.payload;
    const ctx = { module: 'delivery-receivable', action: 'create', deliveryId, deliveryNo };
    let phase = 'init';

    if (totalAmount <= 0) {
      logger.info(ctx, '跳过：发货金额为 0', { deliveryNo });
      return;
    }

    try {
      let created = false;
      await transaction(async (conn) => {
        phase = 'check_duplicate';
        const receivableNo = 'AR' + Date.now();
        logger.info(ctx, '开始处理应收账款创建', { receivableNo, customerId, totalAmount });
        const [existing]: Loose = await conn.execute(
          'SELECT id FROM fin_receivable WHERE source_no = ? AND deleted = 0 LIMIT 1',
          [deliveryNo]
        );
        if (existing && existing.length > 0) {
          secureLog('info', 'Receivable already exists for delivery, skip', {
            deliveryNo,
            deliveryId,
          });
          logger.info(ctx, `跳过：应收账款已存在`, { deliveryNo, existingId: existing[0].id });
          return;
        }
        logger.info(ctx, '无重复记录，准备创建应收账款', { deliveryNo, receivableNo });

        phase = 'insert_receivable';
        const insertParams = [
          receivableNo,
          customerId,
          deliveryNo,
          totalAmount,
          totalAmount,
          `Sales delivery ${deliveryNo} auto-generated`,
        ];
        logger.info(ctx, 'INSERT fin_receivable 参数详情', {
          paramCount: insertParams.length,
          params: insertParams,
        });
        await conn.execute(
          `INSERT INTO fin_receivable
           (receivable_no, customer_id, source_type, source_no, amount, received_amount, balance, status, due_date, remark, create_time)
           VALUES (?, ?, 1, ?, ?, 0, ?, 1, DATE_ADD(CURDATE(), INTERVAL 30 DAY), ?, NOW())`,
          insertParams
        );
        created = true;
        logger.info(ctx, `应收账款创建完成`, {
          receivableNo,
          customerId,
          deliveryNo,
          totalAmount,
        });
      });

      if (created) {
        secureLog('info', 'Receivable created for delivery shipment', { deliveryNo, totalAmount });
        logger.info(ctx, '应收账款流程成功结束', { deliveryNo, totalAmount });
      } else {
        logger.info(ctx, '应收账款流程跳过（未创建）', { deliveryNo });
      }
    } catch (err) {
      logger.error(ctx, `DeliveryReceivable 失败 [phase=${phase}]`, {
        error: err instanceof Error ? err.message : String(err),
        deliveryNo,
        totalAmount,
      });
      throw err;
    }
  }
}
