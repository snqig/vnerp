import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { PurchaseOrderReceivedEvent } from '@/domain/purchase/events/PurchaseOrderEvents';
import { transaction } from '@/lib/db';
import { logger, secureLog } from '@/lib/logger';

export class PurchasePayableHandler implements EventHandler<PurchaseOrderReceivedEvent> {
  async handle(event: PurchaseOrderReceivedEvent): Promise<void> {
    const { orderId, orderNo, supplierId, supplierName, receivedItems, totalReceivedAmount } =
      event.payload;
    const ctx = { module: 'purchase-payable', action: 'create', orderId, orderNo };
    let phase = 'init';

    if (totalReceivedAmount <= 0) {
      logger.info(ctx, '跳过：总收货金额为 0', { orderNo });
      return;
    }

    try {
      await transaction(async (conn) => {
        const periodCode = new Date().toISOString().slice(0, 7).replace('-', '');

        phase = 'insert_vouchers';
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
          logger.info(ctx, `凭证创建`, {
            voucherNo,
            materialId: item.materialId,
            materialName: item.materialName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalItemAmount,
          });
        }

        phase = 'lookup_supplier';
        const [supplierRows]: Loose = await conn.execute(
          'SELECT id FROM pur_supplier WHERE id = ? AND deleted = 0 LIMIT 1',
          [supplierId]
        );
        const dbSupplierId = supplierRows.length > 0 ? supplierRows[0].id : null;
        if (supplierRows.length === 0) {
          logger.warn(ctx, `供应商不存在，应付账款将无关联供应商`, { supplierId, supplierName });
        }

        phase = 'insert_payable';
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
        logger.info(ctx, `应付账款创建完成`, {
          payableNo,
          supplierId: dbSupplierId,
          orderNo,
          totalReceivedAmount,
          voucherCount: receivedItems.length,
        });
      });

      secureLog('info', 'Payable created for purchase received', {
        orderNo,
        totalReceivedAmount,
      });
    } catch (err) {
      logger.error(ctx, `PurchasePayable 失败 [phase=${phase}]`, {
        error: err instanceof Error ? err.message : String(err),
        orderNo,
        totalReceivedAmount,
      });
      throw err;
    }
  }
}
