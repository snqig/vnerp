import { ISalesOrderRepository } from '@/domain/sales/repositories/ISalesOrderRepository';
import { SalesOrder, SalesOrderProps } from '@/domain/sales/aggregates/SalesOrder';
import { SalesOrderStatus } from '@/domain/sales/value-objects/SalesOrderStatus';
import { query, execute, transaction, queryPaginated } from '@/lib/db';
import { generateDocumentNo } from '@/lib/document-numbering';

export class MysqlSalesOrderRepository implements ISalesOrderRepository {
  async findById(id: number): Promise<SalesOrder | null> {
    const orders = await query<any>('SELECT * FROM sal_order WHERE id = ? AND deleted = 0', [id]);
    if (!orders || orders.length === 0) return null;

    const order = orders[0];
    const details = await query<any>(
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
    const params: any[] = [];

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

    const result = await queryPaginated(sql, countSql, params, pagination);

    if (result.data.length > 0) {
      const orderIds = result.data.map((o: any) => o.id);
      const placeholders = orderIds.map(() => '?').join(',');
      const details = await query(
        `SELECT * FROM sal_order_detail WHERE order_id IN (${placeholders}) AND deleted = 0 ORDER BY id ASC`,
        orderIds
      );
      const detailsMap = new Map<number, any[]>();
      for (const d of details as any[]) {
        if (!detailsMap.has(d.order_id)) detailsMap.set(d.order_id, []);
        detailsMap.get(d.order_id)!.push(d);
      }
      for (const order of result.data as any[]) {
        order._details = detailsMap.get(order.id) || [];
      }
    }

    return {
      data: result.data.map((o: any) =>
        SalesOrder.reconstitute(this.mapToProps(o, o._details || []))
      ),
      pagination: result.pagination,
    };
  }

  async save(order: SalesOrder): Promise<{ id: number; orderNo: string }> {
    const orderNo = await generateDocumentNo('sales_order');

    return await transaction(async (conn) => {
      const [orderResult]: any = await conn.execute(
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

  private mapToProps(order: any, details: any[]): SalesOrderProps {
    return {
      id: order.id,
      orderNo: order.order_no,
      status: SalesOrderStatus.fromDbCode(order.status).value,
      customerId: order.customer_id,
      customerName: order.customer_name || '',
      orderDate: order.order_date || '',
      deliveryDate: order.delivery_date || '',
      totalAmount: order.total_amount,
      totalQuantity: order.total_qty,
      warehouseId: order.warehouse_id || 1,
      remark: order.remark || '',
      createBy: order.create_by,
      auditBy: order.audit_by,
      auditTime: order.audit_time,
      lines: (details || []).map((d: any, index: number) => ({
        id: d.id,
        orderId: d.order_id,
        lineNo: index + 1,
        materialId: d.material_id,
        materialCode: d.material_code || '',
        materialName: d.material_name || '',
        specification: d.specification || '',
        unit: d.unit || '件',
        orderQty: d.quantity,
        shippedQty: d.shipped_qty || 0,
        unitPrice: d.unit_price || 0,
        amount: d.amount || 0,
        remark: d.remark,
      })),
      createTime: order.create_time,
      updateTime: order.update_time,
    };
  }
}
