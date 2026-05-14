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
      for (const item of receivedItems) {
        const totalItemAmount = item.quantity * item.unitPrice;

        const voucherNo = 'FV' + Date.now() + String(item.materialId).slice(-4);
        await conn.execute(
          `INSERT INTO fin_voucher (voucher_no, voucher_date, source_type, source_id, source_no, debit_account, credit_account, amount, cost_price, quantity, batch_no, material_id, material_name, warehouse_id)
           VALUES (?, CURDATE(), 'purchase', ?, ?, '原材料库存', '应付账款', ?, ?, ?, ?, ?, ?, ?)`,
          [
            voucherNo,
            orderId,
            orderNo,
            totalItemAmount,
            item.unitPrice,
            item.quantity,
            item.batchNo,
            item.materialId,
            item.materialName,
            item.warehouseId,
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
        `INSERT INTO fin_payable (payable_no, supplier_id, supplier_name, source_type, source_id, source_no, amount, paid_amount, status, due_date, remark, create_time)
         VALUES (?, ?, ?, 'purchase', ?, ?, ?, 0, 1, DATE_ADD(CURDATE(), INTERVAL 30 DAY), ?, NOW())`,
        [
          payableNo,
          dbSupplierId,
          supplierName,
          orderId,
          orderNo,
          totalReceivedAmount,
          `采购订单 ${orderNo} 入库自动生成`,
        ]
      );
    });

    secureLog('info', 'Payable created for purchase received', {
      orderNo,
      totalReceivedAmount,
    });
  }
}
