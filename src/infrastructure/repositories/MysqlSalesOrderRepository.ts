import mysql from 'mysql2/promise';
import { ISalesOrderRepository } from '@/domain/sales/repositories/ISalesOrderRepository';
import { SalesOrder, SalesOrderProps } from '@/domain/sales/aggregates/SalesOrder';
import { SalesOrderStatus } from '@/domain/sales/value-objects/SalesOrderStatus';
import { query, execute, transaction, queryPaginated } from '@/lib/db';
import { generateDocumentNo } from '@/lib/document-numbering';

type SqlValue = string | number | null | boolean | Date;

/** sal_order 表行类型 */
interface SalOrderRow {
  id: number;
  order_no: string;
  customer_id: number;
  customer_name: string;
  order_date: string | null;
  delivery_date: string | null;
  total_amount: number | string;
  total_qty: number | string;
  shipped_qty: number | string;
  status: number;
  warehouse_id: number | null;
  remark: string | null;
  create_by: number | null;
  create_time: string | null;
  update_time: string | null;
  audit_by: number | null;
  audit_time: string | null;
  deleted: number;
}

/** sal_order_detail 表行类型 */
interface SalOrderDetailRow {
  id: number;
  order_id: number;
  material_id: number;
  material_code: string | null;
  material_name: string | null;
  specification: string | null;
  unit: string | null;
  quantity: number | string;
  shipped_qty: number | string;
  unit_price: number | string;
  amount: number | string;
  remark: string | null;
  create_time: string | null;
  update_time: string | null;
  deleted: number;
}

export class MysqlSalesOrderRepository implements ISalesOrderRepository {
  async findById(id: number): Promise<SalesOrder | null> {
    const orders = await query<SalOrderRow>('SELECT * FROM sal_order WHERE id = ? AND deleted = 0', [id]);
    if (!orders || orders.length === 0) return null;

    const order = orders[0];
    const details = await query<SalOrderDetailRow>(
      'SELECT * FROM sal_order_detail WHERE order_id = ? AND deleted = 0 ORDER BY id ASC',
      [id]
    );

    return SalesOrder.reconstitute(this.mapToProps(order, details));
  }

  async findByStatus(
    status: string,
    pagination: { page: number; pageSize: number },
    filters?: { keyword?: string; customerId?: number; startDate?: string; endDate?: string }
  ) {
    let sql = `SELECT o.* FROM sal_order o WHERE o.deleted = 0`;
    let countSql = `SELECT COUNT(*) as total FROM sal_order o WHERE o.deleted = 0`;
    const params: SqlValue[] = [];

    if (status && status !== 'all') {
      const dbCode = SalesOrderStatus.from(status).toDbCode();
      sql += ' AND o.status = ?';
      countSql += ' AND o.status = ?';
      params.push(dbCode);
    }

    if (filters?.keyword) {
      const condition = ' AND (o.order_no LIKE ? OR o.customer_name LIKE ?)';
      sql += condition;
      countSql += condition;
      params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
    }

    if (filters?.customerId) {
      sql += ' AND o.customer_id = ?';
      countSql += ' AND o.customer_id = ?';
      params.push(filters.customerId);
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

    type SalOrderWithDetails = SalOrderRow & { _details?: SalOrderDetailRow[] };
    const result = await queryPaginated<SalOrderWithDetails>(sql, countSql, params, pagination);

    if (result.data.length > 0) {
      const orderIds = result.data.map((o) => o.id);
      const placeholders = orderIds.map(() => '?').join(',');
      const details = await query<SalOrderDetailRow>(
        `SELECT * FROM sal_order_detail WHERE order_id IN (${placeholders}) AND deleted = 0 ORDER BY id ASC`,
        orderIds
      );
      const detailsMap = new Map<number, SalOrderDetailRow[]>();
      for (const d of details) {
        if (!detailsMap.has(d.order_id)) detailsMap.set(d.order_id, []);
        detailsMap.get(d.order_id)!.push(d);
      }
      for (const order of result.data) {
        order._details = detailsMap.get(order.id) || [];
      }
    }

    return {
      data: result.data.map((o) =>
        SalesOrder.reconstitute(this.mapToProps(o, o._details || []))
      ),
      pagination: result.pagination,
    };
  }

  async save(order: SalesOrder): Promise<{ id: number; orderNo: string }> {
    const orderNo = await generateDocumentNo('sales_order');

    return await transaction(async (conn) => {
      const [orderResult] = await conn.execute<mysql.ResultSetHeader>(
        `INSERT INTO sal_order (order_no, customer_id, customer_name, order_date, delivery_date,
          total_amount, total_qty, shipped_qty, status, warehouse_id, remark, create_by, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, NOW())`,
        [
          orderNo,
          order.customerId,
          order.customerName,
          order.orderDate,
          order.deliveryDate || null,
          order.totalAmount,
          order.totalQuantity,
          order.status.toDbCode(),
          order.warehouseId,
          order.remark,
          order.createBy || null,
        ]
      );

      const orderId = orderResult.insertId;

      for (const line of order.lines) {
        await conn.execute(
          `INSERT INTO sal_order_detail (order_id, material_id, material_code, material_name,
            specification, unit, quantity, shipped_qty, unit_price, amount, remark, create_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NOW())`,
          [
            orderId,
            line.materialId,
            line.materialCode,
            line.materialName,
            line.specification,
            line.unit,
            line.orderQty,
            line.unitPrice,
            line.amount,
            line.remark || null,
          ]
        );
      }

      return { id: orderId, orderNo };
    });
  }

  async updateStatus(id: number, status: string, currentStatus: string): Promise<boolean> {
    const dbStatus = SalesOrderStatus.from(status).toDbCode();
    const dbCurrentStatus = SalesOrderStatus.from(currentStatus).toDbCode();
    const result = await execute(
      'UPDATE sal_order SET status = ?, update_time = NOW() WHERE id = ? AND status = ?',
      [dbStatus, id, dbCurrentStatus]
    );
    return result.affectedRows > 0;
  }

  async updateShippedQty(lineId: number, shippedQty: number): Promise<void> {
    await execute('UPDATE sal_order_detail SET shipped_qty = ?, update_time = NOW() WHERE id = ?', [
      shippedQty,
      lineId,
    ]);
  }

  async updateAuditInfo(id: number, auditBy: number, auditTime: string): Promise<void> {
    await execute(
      'UPDATE sal_order SET audit_by = ?, audit_time = ?, update_time = NOW() WHERE id = ?',
      [auditBy, auditTime, id]
    );
  }

  async softDelete(id: number): Promise<void> {
    await execute('UPDATE sal_order SET deleted = 1, update_time = NOW() WHERE id = ?', [id]);
  }

  private mapToProps(order: SalOrderRow, details: SalOrderDetailRow[]): SalesOrderProps {
    return {
      id: order.id,
      orderNo: order.order_no,
      status: SalesOrderStatus.fromDbCode(order.status).value,
      customerId: order.customer_id,
      customerName: order.customer_name || '',
      orderDate: order.order_date || '',
      deliveryDate: order.delivery_date || '',
      totalAmount: Number(order.total_amount),
      totalQuantity: Number(order.total_qty),
      warehouseId: order.warehouse_id || 1,
      remark: order.remark || '',
      createBy: order.create_by ?? undefined,
      auditBy: order.audit_by ?? undefined,
      auditTime: order.audit_time ?? undefined,
      lines: (details || []).map((d, index) => ({
        id: d.id,
        orderId: d.order_id,
        lineNo: index + 1,
        materialId: d.material_id,
        materialCode: d.material_code || '',
        materialName: d.material_name || '',
        specification: d.specification || '',
        unit: d.unit || '件',
        orderQty: Number(d.quantity),
        shippedQty: Number(d.shipped_qty) || 0,
        unitPrice: Number(d.unit_price) || 0,
        amount: Number(d.amount) || 0,
        remark: d.remark ?? undefined,
      })),
      createTime: order.create_time ?? undefined,
      updateTime: order.update_time ?? undefined,
    };
  }
}
