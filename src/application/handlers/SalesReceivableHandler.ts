import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { SalesOrderShippedEvent } from '@/domain/sales/events/SalesOrderEvents';
import { transaction } from '@/lib/db';
import { logger, secureLog } from '@/lib/logger';

export class SalesReceivableHandler implements EventHandler<SalesOrderShippedEvent> {
  async handle(event: SalesOrderShippedEvent): Promise<void> {
    const { orderId, orderNo, customerId, totalShippedAmount } = event.payload;
    const ctx = { module: 'sales-receivable', action: 'create', orderId, orderNo };
    let phase = 'init';

    if (totalShippedAmount <= 0) {
      logger.info(ctx, '跳过：出库金额为 0', { orderNo });
      return;
    }

    try {
      let created = false;
      await transaction(async (conn) => {
        phase = 'check_duplicate';
        const receivableNo = 'AR' + Date.now();
        logger.info(ctx, '开始处理应收账款创建', { receivableNo, customerId, totalShippedAmount });
        const [existing]: Loose = await conn.execute(
          'SELECT id FROM fin_receivable WHERE source_no = ? AND deleted = 0 LIMIT 1',
          [orderNo]
        );
        if (existing && existing.length > 0) {
          secureLog('info', 'Receivable already exists for sales order, skip', {
            orderNo,
            orderId,
          });
          logger.info(ctx, `跳过：应收账款已存在`, { orderNo, existingId: existing[0].id });
          return;
        }
        logger.info(ctx, '无重复记录，准备创建应收账款', { orderNo, receivableNo });

        phase = 'insert_receivable';
        const insertParams = [
          receivableNo,
          customerId,
          orderNo,
          totalShippedAmount,
          totalShippedAmount,
          `Sales order ${orderNo} outbound auto-generated`,
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
          orderNo,
          totalShippedAmount,
        });
      });

      if (created) {
        secureLog('info', 'Receivable created for sales shipment', { orderNo, totalShippedAmount });
        logger.info(ctx, '应收账款流程成功结束', { orderNo, totalShippedAmount });
      } else {
        logger.info(ctx, '应收账款流程跳过（未创建）', { orderNo });
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
