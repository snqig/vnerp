import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { OutboundOrderApprovedEvent } from '@/domain/warehouse/events/OutboundOrderEvents';
import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';

export class OutboundReceivableHandler implements EventHandler<OutboundOrderApprovedEvent> {
  async handle(event: OutboundOrderApprovedEvent): Promise<void> {
    const { outboundNo, customerId, customerName, totalAmount } = event.payload;

    if (totalAmount <= 0 || !customerId) return;

    let created = false;
    await transaction(async (conn) => {
      const [existing]: Loose = await conn.execute(
        'SELECT id FROM fin_receivable WHERE source_no = ? AND deleted = 0 LIMIT 1',
        [outboundNo]
      );
      if (existing && existing.length > 0) {
        secureLog('info', 'Receivable already exists for outbound order, skip', { outboundNo });
        return;
      }

      const receivableNo = 'AR' + Date.now();
      await conn.execute(
        `INSERT INTO fin_receivable
         (receivable_no, customer_id, customer_name, source_type, source_no, amount, received_amount, balance, status, due_date, remark, create_time)
         VALUES (?, ?, ?, 1, ?, ?, 0, ?, 1, DATE_ADD(CURDATE(), INTERVAL 30 DAY), ?, NOW())`,
        [
          receivableNo,
          customerId,
          customerName || null,
          outboundNo,
          totalAmount,
          totalAmount,
          `出库单 ${outboundNo} 自动生成`,
        ]
      );
      created = true;
    });

    if (created) {
      secureLog('info', 'Receivable created for outbound order', { outboundNo, totalAmount });
    }
  }
}
