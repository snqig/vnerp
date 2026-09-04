import { getTranslations } from 'next-intl/server';

import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { SalesOrderShippedEvent } from '@/domain/sales/events/SalesOrderEvents';
import { transaction } from '@/lib/db';
import { logger, secureLog } from '@/lib/logger';

export class SalesReceivableHandler implements EventHandler<SalesOrderShippedEvent> {
  async handle(event: SalesOrderShippedEvent): Promise<void> {
  const ts = await getTranslations('Common');
    const { orderId, orderNo, customerId, totalShippedAmount } = event.payload;
    const ctx = { module: 'sales-receivable', action: 'create', orderId, orderNo };
    let phase = 'init';

    if (totalShippedAmount <= 0) {
      logger.info(ctx, ts('k_m0pkpg'), { orderNo });
      return;
    }

    try {
      let created = false;
      await transaction(async (conn) => {
        phase = 'check_duplicate';
        const receivableNo = 'AR' + Date.now();
        logger.info(ctx, ts('k_1w3nnex'), { receivableNo, customerId, totalShippedAmount });
        const [existing] = (await conn.execute(
          'SELECT id FROM fin_receivable WHERE source_no = ? AND deleted = 0 LIMIT 1',
          [orderNo]
        )) as DbResult;
        if (existing && existing.length > 0) {
          secureLog('info', 'Receivable already exists for sales order, skip', {
            orderNo,
            orderId,
          });
          logger.info(ctx, ts('k_1easwul'), { orderNo, existingId: existing[0].id });
          return;
        }
        logger.info(ctx, ts('k_82y3g6'), { orderNo, receivableNo });

        phase = 'insert_receivable';
        const insertParams = [
          receivableNo,
          customerId,
          orderNo,
          totalShippedAmount,
          totalShippedAmount,
          `Sales order ${orderNo} outbound auto-generated`,
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
          orderNo,
          totalShippedAmount,
        });
      });

      if (created) {
        secureLog('info', 'Receivable created for sales shipment', { orderNo, totalShippedAmount });
        logger.info(ctx, ts('k_1ewya04'), { orderNo, totalShippedAmount });
      } else {
        logger.info(ctx, ts('k_1og1wpl'), { orderNo });
      }
    } catch (err) {
      logger.error(ctx, `SalesReceivable 失败 [phase=${phase}]`, {
        error: err instanceof Error ? err.message : String(err),
        orderNo,
        totalShippedAmount,
      });
      throw err;
    }
  }
}
