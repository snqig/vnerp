import mysql from 'mysql2/promise';
import {
  IPurchaseOrderRepository,
  Pagination,
  PaginatedResult,
} from '@/domain/purchase/repositories/IPurchaseOrderRepository';
import { PurchaseOrder, PurchaseOrderProps } from '@/domain/purchase/aggregates/PurchaseOrder';
import { PurchaseOrderStatus } from '@/domain/purchase/value-objects/PurchaseOrderStatus';
import { query, execute, transaction, queryPaginated } from '@/lib/db';
import { generateDocumentNo } from '@/lib/document-numbering';

type SqlValue = string | number | null | boolean | Date;

/** pur_purchase_order 表行类型 */
interface PurPurchaseOrderRow {
  id: number;
  po_no: string;
  supplier_id: number;
  supplier_name: string;
  supplier_code: string | null;
  order_date: string | null;
  delivery_date: string | null;
  currency: string | null;
  exchange_rate: number | string | null;
  total_amount: number | string;
  total_quantity: number | string;
  tax_rate: number | string | null;
  tax_amount: number | string | null;
  grand_total: number | string | null;
  base_total_amount: number | string;
  base_tax_amount: number | string;
  base_grand_total: number | string;
  status: number;
  over_receipt_tolerance: number | string | null;
  payment_terms: string | null;
  delivery_address: string | null;
  remark: string | null;
  create_by: number | null;
  create_time: string | null;
  update_time: string | null;
  audit_by: number | null;
  audit_time: string | null;
  deleted: number;
}

/** pur_purchase_order_line 表行类型 */
interface PurPurchaseOrderLineRow {
  id: number;
  po_id: number;
  line_no: number;
  material_id: number;
  material_code: string | null;
  material_name: string | null;
  material_spec: string | null;
  unit: string | null;
  order_qty: number | string;
  received_qty: number | string;
  returned_qty: number | string;
  unit_price: number | string;
  amount: number | string;
  tax_rate: number | string | null;
  tax_amount: number | string | null;
  line_total: number | string | null;
  base_unit_price: number | string;
  base_amount: number | string;
  base_tax_amount: number | string;
  base_line_total: number | string;
  require_date: string | null;
  remark: string | null;
}

const LINE_COLUMNS = `id, po_id, line_no, material_id, material_code, material_name, material_spec,
                       unit, order_qty, received_qty, returned_qty, unit_price, amount,
                       tax_rate, tax_amount, line_total, base_unit_price, base_amount, base_tax_amount, base_line_total, require_date, remark`;

export class MysqlPurchaseOrderRepository implements IPurchaseOrderRepository {
  async findById(id: number): Promise<PurchaseOrder | null> {
    const orders = await query<PurPurchaseOrderRow>(
      'SELECT * FROM pur_purchase_order WHERE id = ? AND deleted = 0',
      [id]
    );

    if (!orders || orders.length === 0) return null;

    const order = orders[0];
    const lines = await query<PurPurchaseOrderLineRow>(
      `SELECT ${LINE_COLUMNS} FROM pur_purchase_order_line WHERE po_id = ? ORDER BY line_no ASC`,
      [id]
    );

    return PurchaseOrder.reconstitute(this.mapToProps(order, lines));
  }

  async findByOrderNo(orderNo: string): Promise<PurchaseOrder | null> {
    const orders = await query<PurPurchaseOrderRow>(
      'SELECT * FROM pur_purchase_order WHERE po_no = ? AND deleted = 0',
      [orderNo]
    );

    if (!orders || orders.length === 0) return null;

    const order = orders[0];
    const lines = await query<PurPurchaseOrderLineRow>(
      `SELECT ${LINE_COLUMNS} FROM pur_purchase_order_line WHERE po_id = ? ORDER BY line_no ASC`,
      [order.id]
    );

    return PurchaseOrder.reconstitute(this.mapToProps(order, lines));
  }

  async findByStatus(
    status: string,
    pagination: Pagination,
    filters?: {
      keyword?: string;
      supplierId?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<PaginatedResult<PurchaseOrder>> {
    let sql = `SELECT o.* FROM pur_purchase_order o WHERE o.deleted = 0`;
    let countSql = `SELECT COUNT(*) as total FROM pur_purchase_order o WHERE o.deleted = 0`;
    const params: SqlValue[] = [];

    if (status) {
      const dbCode = status === 'all' ? null : PurchaseOrderStatus.from(status).toDbCode();
      if (dbCode !== null) {
        sql += ' AND o.status = ?';
        countSql += ' AND o.status = ?';
        params.push(dbCode);
      }
    }

    if (filters?.keyword) {
      const condition = ` AND (o.po_no LIKE ? OR o.supplier_name LIKE ?)`;
      sql += condition;
      countSql += condition;
      params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
    }

    if (filters?.supplierId) {
      sql += ' AND o.supplier_id = ?';
      countSql += ' AND o.supplier_id = ?';
      params.push(filters.supplierId);
    }

    if (filters?.startDate) {
      sql += ' AND o.order_date >= ?';
      countSql += ' AND o.order_date >= ?';
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      sql += ' AND o.order_date <= ?';
      countSql += ' AND o.order_date <= ?';
      params.push(filters.endDate);
    }

    sql += ' ORDER BY o.create_time DESC';

    type PurPurchaseOrderWithLines = PurPurchaseOrderRow & { _lines?: PurPurchaseOrderLineRow[] };
    const result = await queryPaginated<PurPurchaseOrderWithLines>(
      sql,
      countSql,
      params,
      pagination
    );

    if (result.data.length > 0) {
      const orderIds = result.data.map((o) => o.id);
      const placeholders = orderIds.map(() => '?').join(',');
      const lines = await query<PurPurchaseOrderLineRow>(
        `SELECT ${LINE_COLUMNS} FROM pur_purchase_order_line WHERE po_id IN (${placeholders}) ORDER BY line_no ASC`,
        orderIds
      );

      const linesMap = new Map<number, PurPurchaseOrderLineRow[]>();
      for (const line of lines) {
        if (!linesMap.has(line.po_id)) {
          linesMap.set(line.po_id, []);
        }
        linesMap.get(line.po_id)!.push(line);
      }

      for (const order of result.data) {
        order._lines = linesMap.get(order.id) || [];
      }
    }

    return {
      data: result.data.map((o) => {
        const lines = o._lines || [];
        return PurchaseOrder.reconstitute(this.mapToProps(o, lines));
      }),
      pagination: result.pagination,
    };
  }

  async save(order: PurchaseOrder): Promise<{ id: number; orderNo: string }> {
    const orderNo = await generateDocumentNo('purchase_order');
    const lines = order.lines;

    return await transaction(async (conn) => {
      const [orderResult] = await conn.execute<mysql.ResultSetHeader>(
        `INSERT INTO pur_purchase_order
         (po_no, supplier_id, supplier_name, supplier_code, order_date, delivery_date,
          currency, exchange_rate, total_amount, total_quantity, tax_rate, tax_amount, grand_total,
          base_total_amount, base_tax_amount, base_grand_total,
          status, over_receipt_tolerance, payment_terms, delivery_address, remark, create_by, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          orderNo,
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
          order.status.toDbCode(),
          order.overReceiptTolerance,
          order.paymentTerms,
          order.deliveryAddress,
          order.remark,
          order.createBy || null,
        ]
      );

      const orderId = orderResult.insertId;

      for (const line of lines) {
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

      return { id: orderId, orderNo };
    });
  }

  async updateStatus(id: number, status: string, currentStatus: string): Promise<boolean> {
    const dbStatus = PurchaseOrderStatus.from(status).toDbCode();
    const dbCurrentStatus = PurchaseOrderStatus.from(currentStatus).toDbCode();
    const result = await execute(
      'UPDATE pur_purchase_order SET status = ?, update_time = NOW() WHERE id = ? AND status = ?',
      [dbStatus, id, dbCurrentStatus]
    );
    return result.affectedRows > 0;
  }

  async updateReceivedQty(lineId: number, receivedQty: number): Promise<void> {
    await execute(
      'UPDATE pur_purchase_order_line SET received_qty = ?, update_time = NOW() WHERE id = ?',
      [receivedQty, lineId]
    );
  }

  async updateAuditInfo(id: number, auditBy: number, auditTime: string): Promise<void> {
    await execute(
      'UPDATE pur_purchase_order SET audit_by = ?, audit_time = ?, update_time = NOW() WHERE id = ?',
      [auditBy, auditTime, id]
    );
  }

  async softDelete(id: number): Promise<void> {
    await execute('UPDATE pur_purchase_order SET deleted = 1, update_time = NOW() WHERE id = ?', [
      id,
    ]);
  }

  private mapToProps(
    order: PurPurchaseOrderRow,
    lines: PurPurchaseOrderLineRow[]
  ): PurchaseOrderProps {
    // 历史种子数据可能存在 domain 未定义的状态码（如 status=2），此时降级为 draft
    // 并记录告警，避免单行脏数据导致整个列表接口 500
    let statusValue: PurchaseOrderProps['status'];
    try {
      statusValue = PurchaseOrderStatus.fromDbCode(order.status).value;
    } catch {
      console.warn(
        `[PurchaseRepository] 未知采购单状态码 status=${order.status} (order id=${order.id}, po_no=${order.po_no})，降级为 draft`
      );
      statusValue = 'draft' as PurchaseOrderProps['status'];
    }
    return {
      id: order.id,
      orderNo: order.po_no,
      status: statusValue,
      supplierId: order.supplier_id,
      supplierName: order.supplier_name || '',
      supplierCode: order.supplier_code || '',
      orderDate: order.order_date || '',
      deliveryDate: order.delivery_date || '',
      currency: order.currency || 'CNY',
      exchangeRate: Number(order.exchange_rate) || 1.0,
      taxRate: Number(order.tax_rate) || 13,
      totalAmount: Number(order.total_amount),
      totalQuantity: Number(order.total_quantity),
      taxAmount: Number(order.tax_amount) || 0,
      grandTotal: Number(order.grand_total) || 0,
      baseCurrency: 'CNY',
      baseTotalAmount: Number(order.base_total_amount) || 0,
      baseTaxAmount: Number(order.base_tax_amount) || 0,
      baseGrandTotal: Number(order.base_grand_total) || 0,
      overReceiptTolerance: Number(order.over_receipt_tolerance) || 0,
      paymentTerms: order.payment_terms || '',
      deliveryAddress: order.delivery_address || '',
      remark: order.remark || '',
      createBy: order.create_by ?? undefined,
      auditBy: order.audit_by ?? undefined,
      auditTime: order.audit_time ?? undefined,
      lines: (lines || []).map((line) => ({
        id: line.id,
        orderId: line.po_id,
        lineNo: line.line_no,
        materialId: line.material_id,
        materialCode: line.material_code || '',
        materialName: line.material_name || '',
        materialSpec: line.material_spec || '',
        unit: line.unit || '件',
        orderQty: Number(line.order_qty),
        receivedQty: Number(line.received_qty) || 0,
        returnedQty: Number(line.returned_qty) || 0,
        unitPrice: Number(line.unit_price) || 0,
        amount: Number(line.amount) || 0,
        taxRate: Number(line.tax_rate) || 13,
        taxAmount: Number(line.tax_amount) || 0,
        lineTotal: Number(line.line_total) || 0,
        baseUnitPrice: Number(line.base_unit_price) || 0,
        baseAmount: Number(line.base_amount) || 0,
        baseTaxAmount: Number(line.base_tax_amount) || 0,
        baseLineTotal: Number(line.base_line_total) || 0,
        requireDate: line.require_date ?? undefined,
        remark: line.remark ?? undefined,
      })),
      createTime: order.create_time ?? undefined,
      updateTime: order.update_time ?? undefined,
    };
  }
}
