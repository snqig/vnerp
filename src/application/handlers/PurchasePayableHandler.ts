import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { PurchaseOrderReceivedEvent } from '@/domain/purchase/events/PurchaseOrderEvents';
import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';

export class PurchasePayableHandler implements EventHandler<PurchaseOrderReceivedEvent> {
  async handle(event: PurchaseOrderReceivedEvent): Promise<void> {
    const { orderId, orderNo, supplierId, supplierName, receivedItems, totalReceivedAmount } =
      event.payload;

    if (totalReceivedAmount <= 0) return;

    await transaction(async (conn) => {
      const periodCode = new Date().toISOString().slice(0, 7).replace('-', '');

      for (const item of receivedItems) {
        const totalItemAmount = item.quantity * item.unitPrice;

        const voucherNo = 'FV' + Date.now() + String(item.materialId).slice(-4);
        await conn.execute(
          `INSERT INTO fin_voucher (voucher_no, period_code, voucher_date, voucher_type, source_type, source_id, source_no, total_debit, total_credit, total_amount, status, summary, create_time)
           VALUES (?, ?, CURDATE(), 2, 'purchase', ?, ?, ?, ?, ?, 0, ?, NOW())`,
          [
            voucherNo,
            periodCode,
            orderId,
            orderNo,
            totalItemAmount,
            totalItemAmount,
            totalItemAmount,
            `Purchase inbound ${orderNo} material ${item.materialName} qty ${item.quantity} batch ${item.batchNo}`,
          ]
        );
      }

      const [supplierRows]: any = await conn.execute(
        'SELECT id FROM pur_supplier WHERE id = ? AND deleted = 0 LIMIT 1',
        [supplierId]
      );
      const dbSupplierId = supplierRows.length > 0 ? supplierRows[0].id : null;

      const payableNo = 'AP' + Date.now();
      await conn.execute(
        `INSERT INTO fin_payable (payable_no, supplier_id, source_type, source_no, amount, paid_amount, balance, status, due_date, remark, create_time)
         VALUES (?, ?, 1, ?, ?, 0, ?, 1, DATE_ADD(CURDATE(), INTERVAL 30 DAY), ?, NOW())`,
        [
          payableNo,
          dbSupplierId,
          orderNo,
          totalReceivedAmount,
          totalReceivedAmount,
          `Purchase order ${orderNo} inbound auto-generated`,
        ]
      );
    });

    secureLog('info', 'Payable created for purchase received', {
      orderNo,
      totalReceivedAmount,
    });
  }
}
