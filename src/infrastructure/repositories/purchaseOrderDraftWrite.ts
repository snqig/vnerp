import mysql from 'mysql2/promise';
import { transaction } from '@/lib/db';
import { PurchaseOrder } from '@/domain/purchase/aggregates/PurchaseOrder';
import { PurchaseOrderStatus } from '@/domain/purchase/value-objects/PurchaseOrderStatus';

/**
 * 草稿采购单整体写入（表头覆盖 + 明细整批替换）。
 *
 * 抽成独立模块的原因是：MysqlPurchaseOrderRepository 与 DrizzlePurchaseOrderRepository
 * 都实现了 IPurchaseOrderRepository，若各自实现会产生两份容易漂移的 SQL。
 *
 * 语义：
 *   - 仅 status = draft 时生效，返回 false 表示状态已流转（调用方按冲突处理）
 *   - 表头与明细在同一事务内完成
 */
export async function updateDraftOrder(order: PurchaseOrder): Promise<boolean> {
  const orderId = order.id;
  if (!orderId) return false;

  const draftCode = PurchaseOrderStatus.draft().toDbCode();

  return await transaction(async (conn) => {
    // 行锁 + 状态复核：避免与「提交/审核」并发时改到已流转单据。
    // 不用 UPDATE 的 affectedRows 判断——值未变化时 affectedRows 也是 0，会被误判为冲突。
    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      'SELECT status FROM pur_purchase_order WHERE id = ? AND deleted = 0 FOR UPDATE',
      [orderId]
    );
    if (!rows || rows.length === 0) return false;
    if (Number(rows[0].status) !== draftCode) return false;

    await conn.execute(
      `UPDATE pur_purchase_order SET
         supplier_id = ?, supplier_name = ?, supplier_code = ?,
         order_date = ?, delivery_date = ?,
         currency = ?, exchange_rate = ?,
         total_amount = ?, total_quantity = ?, tax_rate = ?, tax_amount = ?, grand_total = ?,
         base_total_amount = ?, base_tax_amount = ?, base_grand_total = ?,
         over_receipt_tolerance = ?, payment_terms = ?, delivery_address = ?, remark = ?,
         update_time = NOW()
       WHERE id = ?`,
      [
        order.supplierId,
        order.supplierName,
        order.supplierCode,
        order.orderDate,
        order.deliveryDate || null,
        order.currency,
        order.exchangeRate,
        order.totalAmount,
        order.totalQuantity,
        order.taxRate,
        order.taxAmount,
        order.grandTotal,
        order.baseTotalAmount,
        order.baseTaxAmount,
        order.baseGrandTotal,
        order.overReceiptTolerance,
        order.paymentTerms,
        order.deliveryAddress,
        order.remark,
        orderId,
      ]
    );

    // 明细整批替换：草稿单尚未收货，无 received_qty 历史需要保留，直接物理删除后重插
    await conn.execute('DELETE FROM pur_purchase_order_line WHERE po_id = ?', [orderId]);

    for (const line of order.lines) {
      await conn.execute(
        `INSERT INTO pur_purchase_order_line
         (po_id, line_no, material_id, material_code, material_name, material_spec,
          unit, order_qty, received_qty, returned_qty, unit_price, amount,
          tax_rate, tax_amount, line_total, base_unit_price, base_amount, base_tax_amount, base_line_total, require_date, remark, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          orderId,
          line.lineNo,
          line.materialId,
          line.materialCode,
          line.materialName,
          line.materialSpec,
          line.unit,
          line.orderQty,
          line.receivedQty,
          line.returnedQty,
          line.unitPrice,
          line.amount,
          line.taxRate,
          line.taxAmount,
          line.lineTotal,
          line.baseUnitPrice,
          line.baseAmount,
          line.baseTaxAmount,
          line.baseLineTotal,
          line.requireDate || null,
          line.remark || null,
        ]
      );
    }

    return true;
  });
}
