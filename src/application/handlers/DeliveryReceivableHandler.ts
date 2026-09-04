import { getTranslations } from 'next-intl/server';

import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { DeliveryShippedEvent } from '@/domain/sales/events/DeliveryEvents';
import { transaction } from '@/lib/db';
import { logger, secureLog } from '@/lib/logger';
import type { DbResult } from '@/types/db';

export class DeliveryReceivableHandler implements EventHandler<DeliveryShippedEvent> {
  async handle(event: DeliveryShippedEvent): Promise<void> {
  const ts = await getTranslations('Common');
    const { deliveryId, deliveryNo, orderId: _orderId, customerId, totalAmount } = event.payload;
    const ctx = { module: 'delivery-receivable', action: 'create', deliveryId, deliveryNo };
    let phase = 'init';

    if (totalAmount <= 0) {
      logger.info(ctx, ts('k_ys80wt'), { deliveryNo });
      return;
    }

    try {
      let created = false;
      await transaction(async (conn) => {
        phase = 'check_duplicate';
        const receivableNo = 'AR' + Date.now();
        logger.info(ctx, ts('k_1w3nnex'), { receivableNo, customerId, totalAmount });
        const [existing] = (await conn.execute(
          'SELECT id FROM fin_receivable WHERE source_no = ? AND deleted = 0 LIMIT 1',
          [deliveryNo]
        )) as DbResult;
        if (existing && existing.length > 0) {
          secureLog('info', 'Receivable already exists for delivery, skip', {
            deliveryNo,
            deliveryId,
          });
          logger.info(ctx, ts('k_1easwul'), { deliveryNo, existingId: existing[0].id });
          return;
        }
        logger.info(ctx, ts('k_82y3g6'), { deliveryNo, receivableNo });

        phase = 'insert_receivable';
        const insertParams = [
          receivableNo,
          customerId,
          deliveryNo,
          totalAmount,
          totalAmount,
          `Sales delivery ${deliveryNo} auto-generated`,
        ];
        logger.info(ctx, ts('k_1wgapvr'), {
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
        logger.info(ctx, ts('k_iyloe6'), {
          receivableNo,
          customerId,
          deliveryNo,
          totalAmount,
        });
      });

      if (created) {
        secureLog('info', 'Receivable created for delivery shipment', { deliveryNo, totalAmount });
        logger.info(ctx, ts('k_1ewya04'), { deliveryNo, totalAmount });
      } else {
        logger.info(ctx, ts('k_1og1wpl'), { deliveryNo });
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
