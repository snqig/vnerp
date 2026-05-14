import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { InboundOrderApprovedEvent } from '@/domain/warehouse/events/InboundOrderEvents';
import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';

export class FinanceVoucherHandler implements EventHandler<InboundOrderApprovedEvent> {
  async handle(event: InboundOrderApprovedEvent): Promise<void> {
    const { inboundId, inboundNo, items, totalAmount, supplierName, warehouseId } = event.payload;

    await transaction(async (conn) => {
      for (const item of items) {
        const totalItemAmount = item.quantity * item.unitPrice;

        const voucherNo = 'FV' + Date.now() + String(Math.floor(Math.random() * 10000)).slice(-4);
        await conn.execute(
          `INSERT INTO fin_voucher (voucher_no, voucher_date, source_type, source_id, source_no, debit_account, credit_account, amount, cost_price, quantity, batch_no, material_id, material_name, warehouse_id)
           VALUES (?, CURDATE(), 'inbound', ?, ?, '原材料库存', '应付账款', ?, ?, ?, ?, ?, ?, ?)`,
          [
            voucherNo,
            inboundId,
            inboundNo,
            totalItemAmount,
            item.unitPrice || 0,
            item.quantity,
            item.batchNo,
            item.materialId,
            item.materialName,
            warehouseId,
          ]
        );

        const transNo = 'TRX' + Date.now() + String(Math.floor(Math.random() * 10000)).slice(-4);
        await conn.execute(
          `INSERT INTO inv_inventory_transaction (trans_no, trans_type, source_type, source_id, material_id, material_code, batch_no, warehouse_id, quantity, unit_price, total_amount, account_dr, account_cr, create_time)
           VALUES (?, 'in', 'inbound', ?, ?, ?, ?, ?, ?, ?, ?, '原材料库存', '应付账款', NOW())`,
          [
            transNo,
            inboundId,
            item.materialId,
            item.materialCode || '',
            item.batchNo,
            warehouseId,
            item.quantity,
            item.unitPrice || 0,
            totalItemAmount,
          ]
        );
      }

      if (totalAmount > 0 && supplierName) {
        const [supplierRows]: any = await conn.execute(
          'SELECT id FROM pur_supplier WHERE supplier_name = ? AND deleted = 0 LIMIT 1',
          [supplierName]
        );
        const supplierId = supplierRows.length > 0 ? supplierRows[0].id : null;

        const payableNo = 'AP' + Date.now();
        await conn.execute(
          `INSERT INTO fin_payable (payable_no, supplier_id, supplier_name, source_type, source_id, source_no, amount, paid_amount, status, due_date, remark, create_time)
           VALUES (?, ?, ?, 'inbound', ?, ?, ?, 0, 1, DATE_ADD(CURDATE(), INTERVAL 30 DAY), ?, NOW())`,
          [
            payableNo,
            supplierId,
            supplierName,
            inboundId,
            inboundNo,
            totalAmount,
            `采购入库单 ${inboundNo} 自动生成`,
          ]
        );
      }
    });

    secureLog('info', 'Finance records created for inbound order', { inboundNo, totalAmount });
  }
}
