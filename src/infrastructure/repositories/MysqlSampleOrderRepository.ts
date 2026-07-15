import {
  ISampleOrderRepository,
  SampleOrderFilters,
} from '@/domain/sample/repositories/ISampleOrderRepository';
import { SampleOrder } from '@/domain/sample/aggregates/SampleOrder';
import { SampleOrderStatus } from '@/domain/sample/value-objects/SampleOrderStatus';
import { query, execute, queryPaginated, transaction, SqlValue } from '@/lib/db';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

export class MysqlSampleOrderRepository implements ISampleOrderRepository {
  async findById(id: number): Promise<SampleOrder | null> {
    const rows = await query<RowDataPacket>(
      'SELECT * FROM sal_sample_order WHERE id = ? AND deleted = 0',
      [id]
    );
    if (!rows || rows.length === 0) return null;
    return SampleOrder.reconstitute(this.mapToProps(rows[0]));
  }

  async findByOrderNo(orderNo: string): Promise<SampleOrder | null> {
    const rows = await query<RowDataPacket>(
      'SELECT * FROM sal_sample_order WHERE order_no = ? AND deleted = 0',
      [orderNo]
    );
    if (!rows || rows.length === 0) return null;
    return SampleOrder.reconstitute(this.mapToProps(rows[0]));
  }

  async findByFilters(
    filters: SampleOrderFilters,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ list: SampleOrder[]; total: number }> {
    let sql = 'SELECT * FROM sal_sample_order WHERE deleted = 0';
    let countSql = 'SELECT COUNT(*) as total FROM sal_sample_order WHERE deleted = 0';
    const params: SqlValue[] = [];

    if (filters.orderNo) {
      sql += ' AND order_no LIKE ?';
      countSql += ' AND order_no LIKE ?';
      params.push(`%${filters.orderNo}%`);
    }

    if (filters.customerId) {
      sql += ' AND customer_id = ?';
      countSql += ' AND customer_id = ?';
      params.push(filters.customerId);
    }

    if (filters.customerName) {
      sql += ' AND customer_name LIKE ?';
      countSql += ' AND customer_name LIKE ?';
      params.push(`%${filters.customerName}%`);
    }

    if (filters.status) {
      sql += ' AND status = ?';
      countSql += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.deliveryStatus) {
      sql += ' AND delivery_status = ?';
      countSql += ' AND delivery_status = ?';
      params.push(filters.deliveryStatus);
    }

    if (filters.dateFrom) {
      sql += ' AND create_time >= ?';
      countSql += ' AND create_time >= ?';
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      sql += ' AND create_time <= ?';
      countSql += ' AND create_time <= ?';
      params.push(filters.dateTo);
    }

    if (filters.keyword) {
      sql +=
        ' AND (order_no LIKE ? OR customer_name LIKE ? OR product_name LIKE ? OR material_no LIKE ?)';
      countSql +=
        ' AND (order_no LIKE ? OR customer_name LIKE ? OR product_name LIKE ? OR material_no LIKE ?)';
      const kw = `%${filters.keyword}%`;
      params.push(kw, kw, kw, kw);
    }

    sql += ' ORDER BY create_time DESC';

    const result = await queryPaginated(sql, countSql, params, { page, pageSize });

    return {
      list: result.data.map((row: RowDataPacket) => SampleOrder.reconstitute(this.mapToProps(row))),
      total: result.pagination.total,
    };
  }

  async save(order: SampleOrder, conn?: PoolConnection): Promise<number> {
    const p = order.toProps();
    const result = await this.execWith(
      conn,
      `INSERT INTO sal_sample_order
       (order_no, notify_date, customer_id, customer_name, product_name, material_no, version,
        size_spec, material_spec, specification, quantity, order_date, customer_require_date,
        delivery_date, actual_delivery_date, delivery_status, status, remark, create_by, create_time,
        process_card_id, work_order_id, sales_order_id, sample_fee, fee_charged, fee_deductible,
        fee_deducted, sample_version, parent_version_id, converted_at, converted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(),
               ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.orderNo,
        p.notifyDate || null,
        p.customerId || null,
        p.customerName || null,
        p.productName || null,
        p.materialNo || null,
        p.version || 'A',
        p.sizeSpec || null,
        p.materialSpec || null,
        p.specification || null,
        p.quantity || 0,
        p.orderDate || null,
        p.customerRequireDate || null,
        p.deliveryDate || null,
        p.actualDeliveryDate || null,
        p.deliveryStatus || 'pending',
        p.status || 'draft',
        p.remark || null,
        p.createBy || null,
        p.processCardId || null,
        p.workOrderId || null,
        p.salesOrderId || null,
        p.sampleFee || 0,
        p.feeCharged || 0,
        p.feeDeductible || 0,
        p.feeDeducted || 0,
        p.sampleVersion || 1,
        p.parentVersionId || null,
        p.convertedAt || null,
        p.convertedBy || null,
      ]
    );
    return result.insertId;
  }

  async update(order: SampleOrder, conn?: PoolConnection): Promise<void> {
    const p = order.toProps();
    await this.execWith(
      conn,
      `UPDATE sal_sample_order SET
        notify_date = ?, customer_id = ?, customer_name = ?, product_name = ?,
        material_no = ?, version = ?, size_spec = ?, material_spec = ?, specification = ?,
        quantity = ?, order_date = ?, customer_require_date = ?, delivery_date = ?,
        actual_delivery_date = ?, delivery_status = ?, status = ?, remark = ?,
        process_card_id = ?, work_order_id = ?, sales_order_id = ?,
        sample_fee = ?, fee_charged = ?, fee_deductible = ?, fee_deducted = ?,
        sample_version = ?, parent_version_id = ?, converted_at = ?, converted_by = ?,
        update_time = NOW()
       WHERE id = ? AND deleted = 0`,
      [
        p.notifyDate || null,
        p.customerId || null,
        p.customerName || null,
        p.productName || null,
        p.materialNo || null,
        p.version || 'A',
        p.sizeSpec || null,
        p.materialSpec || null,
        p.specification || null,
        p.quantity || 0,
        p.orderDate || null,
        p.customerRequireDate || null,
        p.deliveryDate || null,
        p.actualDeliveryDate || null,
        p.deliveryStatus || 'pending',
        p.status || 'draft',
        p.remark || null,
        p.processCardId || null,
        p.workOrderId || null,
        p.salesOrderId || null,
        p.sampleFee || 0,
        p.feeCharged || 0,
        p.feeDeductible || 0,
        p.feeDeducted || 0,
        p.sampleVersion || 1,
        p.parentVersionId || null,
        p.convertedAt || null,
        p.convertedBy || null,
        p.id,
      ]
    );
  }

  /**
   * 在外部事务连接或默认连接池上执行写操作。
   * 当 conn 提供时，使用该连接（加入外部事务）；否则回退到全局 execute（走连接池）。
   */
  private async execWith(
    conn: PoolConnection | undefined,
    sql: string,
    values: SqlValue[]
  ): Promise<ResultSetHeader> {
    if (conn) {
      // mysql2 的 execute 类型签名比 query 更严格（不接受 undefined），实际运行时支持
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [result] = await conn.execute(sql, values as any[]);
      return result as ResultSetHeader;
    }
    return execute(sql, values);
  }

  async delete(id: number): Promise<void> {
    await execute('UPDATE sal_sample_order SET deleted = 1, update_time = NOW() WHERE id = ?', [
      id,
    ]);
  }

  async exists(orderNo: string): Promise<boolean> {
    const rows = await query<RowDataPacket>(
      'SELECT 1 FROM sal_sample_order WHERE order_no = ? AND deleted = 0 LIMIT 1',
      [orderNo]
    );
    return rows && rows.length > 0;
  }

  async getNextSequence(): Promise<string> {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const prefix = `SP${y}${m}${d}`;

    return transaction(async (conn) => {
      const [lockResult] = await conn.query('SELECT GET_LOCK(?, 10) AS acquired', [
        'sample_order_seq',
      ]);
      if ((lockResult as RowDataPacket[])[0]?.acquired !== 1) {
        throw new Error('获取打样单序号锁超时');
      }
      try {
        const [rows] = await conn.query(
          'SELECT COUNT(*) AS cnt FROM sal_sample_order WHERE order_no LIKE ? AND deleted = 0',
          [`${prefix}%`]
        );
        const nextSeq = ((rows as RowDataPacket[])[0]?.cnt || 0) + 1;
        return `${prefix}${String(nextSeq).padStart(4, '0')}`;
      } finally {
        await conn.query('SELECT RELEASE_LOCK(?)', ['sample_order_seq']);
      }
    });
  }

  private mapToProps(row: RowDataPacket) {
    return {
      id: row.id,
      orderNo: row.order_no,
      notifyDate: row.notify_date,
      customerId: row.customer_id,
      customerName: row.customer_name,
      productName: row.product_name,
      materialNo: row.material_no,
      version: row.version,
      sizeSpec: row.size_spec,
      materialSpec: row.material_spec,
      specification: row.specification,
      quantity: row.quantity,
      orderDate: row.order_date,
      customerRequireDate: row.customer_require_date,
      deliveryDate: row.delivery_date,
      actualDeliveryDate: row.actual_delivery_date,
      deliveryStatus: row.delivery_status,
      status: row.status as SampleOrderStatus,
      remark: row.remark,
      createBy: row.create_by,
      createTime: row.create_time,
      updateTime: row.update_time,
      processCardId: row.process_card_id,
      workOrderId: row.work_order_id,
      salesOrderId: row.sales_order_id,
      sampleFee: row.sample_fee,
      feeCharged: row.fee_charged,
      feeDeductible: row.fee_deductible,
      feeDeducted: row.fee_deducted,
      sampleVersion: row.sample_version,
      parentVersionId: row.parent_version_id,
      convertedAt: row.converted_at,
      convertedBy: row.converted_by,
    };
  }
}
