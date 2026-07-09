import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { SalesOrderShippedEvent } from '@/domain/sales/events/SalesOrderEvents';
import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';

export class SalesReceivableHandler implements EventHandler<SalesOrderShippedEvent> {
  async handle(event: SalesOrderShippedEvent): Promise<void> {
    const { orderId, orderNo, customerId, totalShippedAmount } = event.payload;

    if (totalShippedAmount <= 0) return;

    let created = false;
    await transaction(async (conn) => {
      const receivableNo = 'AR' + Date.now();
      const [existing]: Loose = await conn.execute(
        'SELECT id FROM fin_receivable WHERE source_no = ? AND deleted = 0 LIMIT 1',
        [orderNo]
      );
      if (existing && existing.length > 0) {
        secureLog('info', 'Receivable already exists for sales order, skip', { orderNo, orderId });
        return;
      }

      await conn.execute(
        `INSERT INTO fin_receivable
         (receivable_no, customer_id, source_type, source_no, amount, received_amount, balance, status, due_date, remark, create_time)
         VALUES (?, ?, 1, ?, ?, 0, ?, 1, DATE_ADD(CURDATE(), INTERVAL 30 DAY), ?, NOW())`,
        [
          receivableNo,
          customerId,
          orderNo,
          totalShippedAmount,
          totalShippedAmount,
          `Sales order ${orderNo} outbound auto-generated`,
        ]
      );
      created = true;
    });

    if (created) {
      secureLog('info', 'Receivable created for sales shipment', { orderNo, totalShippedAmount });
    }
  }
}
