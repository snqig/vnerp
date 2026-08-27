import { IOutboundOrderRepository } from '@/domain/warehouse/repositories/IOutboundOrderRepository';
import {
  Pagination,
  PaginatedResult,
} from '@/domain/warehouse/repositories/IInboundOrderRepository';
import { OutboundOrder, OutboundOrderProps } from '@/domain/warehouse/aggregates/OutboundOrder';
import { query, execute, transaction, queryPaginated, SqlValue } from '@/lib/db';
import { generateDocumentNo } from '@/lib/document-numbering';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const DOMAIN_TO_DB_STATUS: Record<string, string> = {
  draft: 'draft',
  pending: 'pending',
  completed: 'approved',
  cancelled: 'cancelled',
};

const DB_TO_DOMAIN_STATUS: Record<string, string> = {
  draft: 'draft',
  pending: 'pending',
  approved: 'completed',
  completed: 'completed',
  cancelled: 'cancelled',
};

const ITEM_COLUMNS = `id, order_id, material_id, material_code, material_name, material_spec,
                      batch_no, batch_id, quantity, unit, unit_price, amount, warehouse_location, remark`;

export class MysqlOutboundOrderRepository implements IOutboundOrderRepository {
  async findById(id: number): Promise<OutboundOrder | null> {
    const orders = await query<RowDataPacket>(
      'SELECT * FROM inv_outbound_order WHERE id = ? AND deleted = 0',
      [id]
    );
    if (!orders || orders.length === 0) return null;

    const order = orders[0];
    const items = await query<RowDataPacket>(
      `SELECT ${ITEM_COLUMNS} FROM inv_outbound_item WHERE order_id = ? AND deleted = 0`,
      [id]
    );

    return OutboundOrder.reconstitute(this.mapRowToProps(order, items));
  }

  async findByOrderNo(orderNo: string): Promise<OutboundOrder | null> {
    const orders = await query<RowDataPacket>(
      'SELECT * FROM inv_outbound_order WHERE order_no = ? AND deleted = 0',
      [orderNo]
    );
    if (!orders || orders.length === 0) return null;

    const order = orders[0];
    const items = await query<RowDataPacket>(
      `SELECT ${ITEM_COLUMNS} FROM inv_outbound_item WHERE order_id = ? AND deleted = 0`,
      [order.id]
    );

    return OutboundOrder.reconstitute(this.mapRowToProps(order, items));
  }

  async findByStatus(
    status: string,
    pagination: Pagination,
    filters?: {
      keyword?: string;
      outboundType?: string;
      warehouseId?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<PaginatedResult<OutboundOrder>> {
    let sql = `SELECT o.id, o.order_no, o.order_date, o.outbound_type, o.warehouse_id,
               o.warehouse_name, o.customer_id, o.customer_name, o.work_order_id, o.work_order_no,
               o.total_qty, o.total_amount,
               o.currency, o.exchange_rate, o.base_total_amount,
               o.status, o.audit_status, o.finance_posted,
               o.operator_id, o.operator_name, o.remark, o.create_time, o.update_time
               FROM inv_outbound_order o WHERE o.deleted = 0`;
    let countSql = `SELECT COUNT(*) as total FROM inv_outbound_order o WHERE o.deleted = 0`;
    const params: SqlValue[] = [];

    if (filters?.keyword) {
      const condition = ` AND (o.order_no LIKE ? OR o.customer_name LIKE ? OR o.work_order_no LIKE ?)`;
      sql += condition;
      countSql += condition;
      params.push(`%${filters.keyword}%`, `%${filters.keyword}%`, `%${filters.keyword}%`);
    }

    if (status) {
      const dbStatus = DOMAIN_TO_DB_STATUS[status] || status;
      sql += ` AND o.status = ?`;
      countSql += ` AND o.status = ?`;
      params.push(dbStatus);
    }

    if (filters?.outboundType) {
      sql += ` AND o.outbound_type = ?`;
      countSql += ` AND o.outbound_type = ?`;
      params.push(filters.outboundType);
    }

    if (filters?.warehouseId) {
      sql += ` AND o.warehouse_id = ?`;
      countSql += ` AND o.warehouse_id = ?`;
      params.push(filters.warehouseId);
    }

    if (filters?.startDate) {
      sql += ` AND o.order_date >= ?`;
      countSql += ` AND o.order_date >= ?`;
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      sql += ` AND o.order_date <= ?`;
      countSql += ` AND o.order_date <= ?`;
      params.push(filters.endDate);
    }

    sql += ` ORDER BY o.create_time DESC`;

    const result = await queryPaginated(sql, countSql, params, pagination);

    if (result.data.length > 0) {
      const orderIds = result.data.map((o: RowDataPacket) => o.id);
      const placeholders = orderIds.map(() => '?').join(',');
      const items = await query<RowDataPacket>(
        `SELECT ${ITEM_COLUMNS} FROM inv_outbound_item WHERE order_id IN (${placeholders}) AND deleted = 0`,
        orderIds
      );

      const itemsMap = new Map<number, RowDataPacket[]>();
      for (const item of items) {
        if (!itemsMap.has(item.order_id)) {
          itemsMap.set(item.order_id, []);
        }
        itemsMap.get(item.order_id)!.push(item);
      }

      for (const order of result.data as RowDataPacket[]) {
        order.items = itemsMap.get(order.id) || [];
      }
    }

    return {
      data: result.data.map((o: RowDataPacket) =>
        OutboundOrder.reconstitute(this.mapRowToProps(o, o.items || []))
      ),
      pagination: result.pagination,
    };
  }

  async save(order: OutboundOrder): Promise<{ id: number; orderNo: string }> {
    const orderNo = await generateDocumentNo('outbound');
    const items = order.items;

    return await transaction(async (conn) => {
      const [orderResult] = (await conn.execute(
        `INSERT INTO inv_outbound_order
         (order_no, order_date, outbound_type, warehouse_id, warehouse_name,
           customer_id, customer_name, work_order_id, work_order_no,
           total_qty, total_amount,
           currency, exchange_rate, base_total_amount,
           status, audit_status, finance_posted,
           operator_id, operator_name, remark, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          orderNo,
          order.orderDate,
          order.outboundType || 'production',
          order.warehouseId,
          order.warehouseName || null,
          order.customerId || null,
          order.customerName || null,
          order.workOrderId || null,
          order.workOrderNo || null,
          order.totalQuantity,
          order.totalAmount.amount,
          order.currency,
          order.exchangeRate,
          order.baseTotalAmount,
          DOMAIN_TO_DB_STATUS[order.status.value] || order.status.value,
          order.auditStatus,
          order.financePosted ? 1 : 0,
          order.operatorId || null,
          order.operatorName || null,
          order.remark || null,
        ]
      )) as [ResultSetHeader, any];

      const orderId = orderResult.insertId;

      for (const item of items) {
        await conn.execute(
          `INSERT INTO inv_outbound_item
           (order_id, material_id, material_code, material_name, material_spec,
            batch_no, batch_id, quantity, unit, unit_price, amount, warehouse_location, remark, create_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            orderId,
            item.materialId,
            item.materialCode || null,
            item.materialName || null,
            item.materialSpec || null,
            item.batchNo || null,
            item.batchId || null,
            item.quantity,
            item.unit || null,
            item.unitPrice || 0,
            item.totalPrice || 0,
            item.warehouseLocation || null,
            item.remark || null,
          ]
        );
      }

      return { id: orderId, orderNo };
    });
  }

  async updateStatus(id: number, status: string, currentStatus: string): Promise<boolean> {
    const dbStatus = DOMAIN_TO_DB_STATUS[status] || status;
    const dbCurrentStatus = DOMAIN_TO_DB_STATUS[currentStatus] || currentStatus;
    const result = await execute(
      'UPDATE inv_outbound_order SET status = ?, update_time = NOW() WHERE id = ? AND status = ?',
      [dbStatus, id, dbCurrentStatus]
    );
    return result.affectedRows > 0;
  }

  async updateAuditAndFinance(
    id: number,
    auditStatus: number,
    financePosted: boolean,
    auditorId?: number,
    auditorName?: string
  ): Promise<void> {
    await execute(
      `UPDATE inv_outbound_order
       SET audit_status = ?, finance_posted = ?, auditor_id = ?, auditor_name = ?, audit_time = NOW(), update_time = NOW()
       WHERE id = ?`,
      [auditStatus, financePosted ? 1 : 0, auditorId || null, auditorName || null, id]
    );
  }

  async softDelete(id: number): Promise<void> {
    await execute('UPDATE inv_outbound_order SET deleted = 1, update_time = NOW() WHERE id = ?', [
      id,
    ]);
  }

  private mapRowToProps(order: RowDataPacket, items: RowDataPacket[]): OutboundOrderProps {
    return {
      id: order.id,
      orderNo: order.order_no,
      status: (DB_TO_DOMAIN_STATUS[order.status] || order.status) as any,
      warehouseId: order.warehouse_id,
      warehouseName: order.warehouse_name,
      outboundType: order.outbound_type,
      orderDate: order.order_date,
      customerId: order.customer_id,
      customerName: order.customer_name,
      workOrderId: order.work_order_id,
      workOrderNo: order.work_order_no,
      currency: order.currency || 'CNY',
      exchangeRate: Number(order.exchange_rate) || 1.0,
      baseCurrency: 'CNY',
      baseTotalAmount: Number(order.base_total_amount) || 0,
      operatorId: order.operator_id,
      operatorName: order.operator_name,
      financePosted: !!order.finance_posted,
      auditStatus: order.audit_status,
      auditorId: order.auditor_id,
      auditorName: order.auditor_name,
      auditTime: order.audit_time,
      auditRemark: order.audit_remark,
      remark: order.remark,
      items: items.map((item: RowDataPacket) => ({
        id: item.id,
        orderId: item.order_id,
        materialId: item.material_id,
        materialCode: item.material_code,
        materialName: item.material_name,
        materialSpec: item.material_spec,
        batchNo: item.batch_no || '',
        batchId: item.batch_id,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unit_price,
        warehouseLocation: item.warehouse_location,
        remark: item.remark,
      })),
      totalAmount: order.total_amount,
      totalQuantity: order.total_qty,
      createTime: order.create_time,
      updateTime: order.update_time,
    };
  }
}
