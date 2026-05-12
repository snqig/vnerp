import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { SalesOrderShippedEvent } from '@/domain/sales/events/SalesOrderEvents';
import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';

export class SalesReceivableHandler implements EventHandler<SalesOrderShippedEvent> {
  async handle(event: SalesOrderShippedEvent): Promise<void> {
    const { orderId, orderNo, customerId, customerName, totalShippedAmount } = event.payload;

    if (totalShippedAmount <= 0) return;

    await transaction(async (conn) => {
      const receivableNo = 'AR' + Date.now();
      await conn.execute(
        `INSERT INTO fin_receivable (receivable_no, customer_id, customer_name, source_type, source_id, source_no, amount, received_amount, status, due_date, remark, create_time)
         VALUES (?, ?, ?, 'sales', ?, ?, ?, 0, 1, DATE_ADD(CURDATE(), INTERVAL 30 DAY), ?, NOW())`,
        [receivableNo, customerId, customerName, orderId, orderNo, totalShippedAmount, `销售订单 ${orderNo} 出库自动生成`]
      );
    });

    secureLog('info', 'Receivable created for sales shipment', { orderNo, totalShippedAmount });
  }
}
