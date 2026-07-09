import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { InboundOrderApprovedEvent } from '@/domain/warehouse/events/InboundOrderEvents';
import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';

export class FinanceVoucherHandler implements EventHandler<InboundOrderApprovedEvent> {
  async handle(event: InboundOrderApprovedEvent): Promise<void> {
    const { inboundId, inboundNo, totalAmount, supplierId } = event.payload;

    if (totalAmount <= 0 || !supplierId) return;

    await transaction(async (conn) => {
      const payableNo = 'AP' + Date.now();
      await conn.execute(
        `INSERT INTO fin_payable
         (payable_no, supplier_id, source_type, source_no, amount, paid_amount, balance, status, due_date, remark, create_time)
         VALUES (?, ?, 1, ?, ?, 0, ?, 1, DATE_ADD(CURDATE(), INTERVAL 30 DAY), ?, NOW())`,
        [
          payableNo,
          supplierId,
          inboundNo,
          totalAmount,
          totalAmount,
          `采购入库单 ${inboundNo} 自动生成`,
        ]
      );
    });

    secureLog('info', 'Payable created for inbound order', {
      inboundNo,
      totalAmount,
      supplierId,
    });
  }
}
