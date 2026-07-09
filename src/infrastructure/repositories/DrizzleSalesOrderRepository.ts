/**
 * DrizzleSalesOrderRepository
 *
 * Drizzle ORM 实现的销售订单仓储，对应 ISalesOrderRepository 接口。
 * 字段映射以 database/vnerpdacahng_schema.sql 实际 DDL 为准（与 src/lib/db/schema.ts 一致）。
 *
 * 已知架构缺口（不在此仓储修复范围）：
 *   - SalesOrder 聚合期望 customerName/totalQuantity/warehouseId/auditBy/auditTime 字段，
 *     但 sal_order 实际表无对应列。本仓储用合理默认值填充以保持聚合并发兼容。
 *   - SalesOrderLine 期望 materialCode/specification/shippedQty，但 sal_order_detail 无对应列
 *     （仅有 deliveredQty）。本仓储将 shippedQty 映射为 deliveredQty，其余用空串/0 填充。
 *   - 历史 MysqlSalesOrderRepository 查询了 customer_name/total_qty/shipped_qty/audit_by/audit_time
 *     等不存在的列，运行时会抛 SQL 错误——本仓储修复了该问题。
 *
 * 接入方式：通过 RepositoryRegistry.getSalesOrderRepository() 获取实例，
 *   默认 REPOSITORY_IMPL=mysql 时不会被调用。
 */

import { eq, and, like, or, gte, lte, desc, inArray, sql, count } from 'drizzle-orm';
import { drizzleDb } from '@/lib/db';
import { salOrder, salOrderDetail } from '@/lib/db/schema';
import { transaction } from '@/lib/db';
import { ISalesOrderRepository } from '@/domain/sales/repositories/ISalesOrderRepository';
import { SalesOrder, SalesOrderProps } from '@/domain/sales/aggregates/SalesOrder';
import { SalesOrderStatus, SalesStatus } from '@/domain/sales/value-objects/SalesOrderStatus';
import { generateDocumentNo } from '@/lib/document-numbering';

type SalOrderRow = typeof salOrder.$inferSelect;
type SalOrderDetailRow = typeof salOrderDetail.$inferSelect;

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// SQL 日志辅助：记录方法名、表名、查询条件、SQL 描述、参数、结果、耗时
// table/conditions 字段便于后续按表名和条件维度做性能分析（如 grep 聚合慢查询）
function logOp(
  method: string,
  table: string,
  conditions: string,
  sqlDesc: string,
  params: unknown,
  result: unknown,
  durationMs: number
) {
  console.warn(
    `[DrizzleSalesRepo] ${method} (${durationMs}ms)\n` +
      `  TABLE: ${table}\n` +
      `  CONDITIONS: ${conditions}\n` +
      `  SQL: ${sqlDesc}\n` +
      `  PARAMS: ${JSON.stringify(params)}\n` +
      `  RESULT: ${typeof result === 'object' ? JSON.stringify(result) : result}`
  );
}

function nowMs() {
  return Date.now();
}

export class DrizzleSalesOrderRepository implements ISalesOrderRepository {
  /**
   * findById - 按 ID 查询单个销售订单 + 明细
   */
  async findById(id: number): Promise<SalesOrder | null> {
    const t0 = nowMs();
    const sqlDesc = `SELECT * FROM sal_order WHERE id=${id} AND deleted=false LIMIT 1`;
    const order = await drizzleDb.query.salOrder.findFirst({
      where: and(eq(salOrder.id, id), eq(salOrder.deleted, false)),
    });

    if (!order) {
      logOp(
        'findById',
        'sal_order',
        `id=${id} AND deleted=false`,
        sqlDesc,
        { id },
        'null (not found)',
        nowMs() - t0
      );
      return null;
    }

    const detailsSqlDesc = `SELECT * FROM sal_order_detail WHERE order_id=${id} AND deleted=false ORDER BY id`;
    const details = await drizzleDb.query.salOrderDetail.findMany({
      where: and(eq(salOrderDetail.orderId, id), eq(salOrderDetail.deleted, false)),
      orderBy: (t) => t.id,
    });

    const result = SalesOrder.reconstitute(this.mapToProps(order, details));
    logOp(
      'findById',
      'sal_order + sal_order_detail',
      `id=${id} AND deleted=false`,
      `${sqlDesc}; ${detailsSqlDesc}`,
      { id },
      `order+${details.length} details`,
      nowMs() - t0
    );
    return result;
  }

  /**
   * findByStatus - 分页列表 + 动态过滤 + 批量加载明细
   */
  async findByStatus(
    status: string,
    pagination: { page: number; pageSize: number },
    filters?: { keyword?: string; customerId?: number; startDate?: string; endDate?: string }
  ): Promise<PaginatedResult<SalesOrder>> {
    const t0 = nowMs();
    const conditions = [eq(salOrder.deleted, false)];

    if (status && status !== 'all') {
      const dbCode = SalesOrderStatus.from(status).toDbCode();
      conditions.push(eq(salOrder.status, dbCode));
    }

    if (filters?.keyword) {
      const kw = `%${filters.keyword}%`;
      conditions.push(or(like(salOrder.orderNo, kw), like(salOrder.contactName, kw))!);
    }

    if (filters?.customerId) {
      conditions.push(eq(salOrder.customerId, filters.customerId));
    }

    if (filters?.startDate) {
      conditions.push(gte(salOrder.orderDate, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      conditions.push(lte(salOrder.orderDate, new Date(filters.endDate)));
    }

    const where = and(...conditions);

    const totalRow = await drizzleDb.select({ total: count() }).from(salOrder).where(where);
    const total = totalRow[0]?.total ?? 0;

    const orders = await drizzleDb
      .select()
      .from(salOrder)
      .where(where)
      .orderBy(desc(salOrder.createTime))
      .limit(pagination.pageSize)
      .offset((pagination.page - 1) * pagination.pageSize);

    if (orders.length === 0) {
      logOp(
        'findByStatus',
        'sal_order',
        `deleted=false AND status=${status} LIMIT ${pagination.pageSize} OFFSET ${(pagination.page - 1) * pagination.pageSize}`,
        `SELECT * FROM sal_order WHERE deleted=false AND status=${status} LIMIT ${pagination.pageSize} OFFSET ${(pagination.page - 1) * pagination.pageSize}`,
        { status, pagination, filters },
        '0 rows (empty)',
        nowMs() - t0
      );
      return {
        data: [],
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const orderIds = orders.map((o) => o.id);
    const allDetails = await drizzleDb.query.salOrderDetail.findMany({
      where: and(inArray(salOrderDetail.orderId, orderIds), eq(salOrderDetail.deleted, false)),
      orderBy: (t) => t.id,
    });

    const detailsMap = new Map<number, SalOrderDetailRow[]>();
    for (const d of allDetails) {
      const list = detailsMap.get(d.orderId) ?? [];
      list.push(d);
      detailsMap.set(d.orderId, list);
    }

    const data = orders.map((o) =>
      SalesOrder.reconstitute(this.mapToProps(o, detailsMap.get(o.id) ?? []))
    );

    logOp(
      'findByStatus',
      'sal_order + sal_order_detail',
      `deleted=false AND status=${status} LIMIT ${pagination.pageSize} OFFSET ${(pagination.page - 1) * pagination.pageSize}`,
      `SELECT * FROM sal_order WHERE deleted=false AND status=${status} LIMIT ${pagination.pageSize} OFFSET ${(pagination.page - 1) * pagination.pageSize}; SELECT * FROM sal_order_detail WHERE order_id IN (${orderIds.join(',')})`,
      { status, pagination, filters },
      `${orders.length} orders, ${allDetails.length} details, total=${total}`,
      nowMs() - t0
    );

    return {
      data,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.ceil(total / pagination.pageSize),
      },
    };
  }

  /**
   * save - 事务插入主表 + 批量插入明细
   * 沿用 DrizzleInboundOrderRepository 模式：transaction 包装 + conn.execute raw SQL
   */
  async save(order: SalesOrder): Promise<{ id: number; orderNo: string }> {
    const t0 = nowMs();
    const orderNo = await generateDocumentNo('sales_order');

    const result = await transaction(async (conn) => {
      const orderSql = `INSERT INTO sal_order (order_no, order_date, customer_id, contact_name, ..., status, remark, create_by, create_time) VALUES (?, ?, ?, ..., NOW())`;
      const orderParams = [
        orderNo,
        order.orderDate || null,
        order.customerId,
        order.customerName || null,
        null,
        null,
        null,
        order.totalAmount,
        0,
        order.totalAmount,
        0,
        'CNY',
        1.0,
        null,
        order.deliveryDate || null,
        null,
        order.status.toDbCode(),
        order.remark || null,
        order.createBy || null,
      ];
      console.warn(
        `[DrizzleSalesRepo] save (entry)\n  TABLE: sal_order (INSERT)\n  CONDITIONS: N/A (new row)\n  SQL: ${orderSql}\n  PARAMS: ${JSON.stringify(orderParams)}`
      );

      const [orderResult]: any = await conn.execute(
        `INSERT INTO sal_order
         (order_no, order_date, customer_id, contact_name, contact_phone, delivery_address,
          salesman_id, total_amount, tax_amount, total_with_tax, discount_amount,
          currency, exchange_rate, payment_terms, delivery_date, contract_no,
          status, remark, create_by, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        orderParams
      );
      const orderId = orderResult.insertId;

      for (const line of order.lines) {
        const lineParams = [
          orderId,
          line.materialId,
          line.materialName || null,
          line.orderQty,
          line.unit || null,
          line.unitPrice,
          0,
          line.amount,
          0,
          line.amount,
          line.shippedQty || 0,
          null,
          line.remark || null,
        ];
        console.warn(
          `[DrizzleSalesRepo] save (line)\n` +
            `  TABLE: sal_order_detail (INSERT)\n` +
            `  CONDITIONS: N/A (new row, order_id=${orderId})\n` +
            `  SQL: INSERT INTO sal_order_detail (order_id, material_id, ...) VALUES (?, ?, ...)\n` +
            `  PARAMS: ${JSON.stringify(lineParams)}`
        );
        await conn.execute(
          `INSERT INTO sal_order_detail
           (order_id, material_id, material_name, quantity, unit, unit_price,
            tax_rate, amount, tax_amount, total_amount, delivered_qty, delivery_date, remark, create_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          lineParams
        );
      }

      return { id: orderId, orderNo };
    });

    logOp(
      'save',
      'sal_order (INSERT) + sal_order_detail (INSERT)',
      'N/A (new row)',
      `INSERT INTO sal_order (...) + ${order.lines.length} detail inserts (in transaction)`,
      { orderNo, customerId: order.customerId, lineCount: order.lines.length },
      result,
      nowMs() - t0
    );
    return result;
  }

  /**
   * updateStatus - 乐观锁 UPDATE
   */
  async updateStatus(id: number, status: string, currentStatus: string): Promise<boolean> {
    const t0 = nowMs();
    const dbStatus = SalesOrderStatus.from(status).toDbCode();
    const dbCurrentStatus = SalesOrderStatus.from(currentStatus).toDbCode();

    const result = await drizzleDb
      .update(salOrder)
      .set({ status: dbStatus, updateTime: new Date() })
      .where(and(eq(salOrder.id, id), eq(salOrder.status, dbCurrentStatus)));

    const affected = (result[0] as any)?.affectedRows > 0;
    logOp(
      'updateStatus',
      'sal_order (UPDATE)',
      `id=${id} AND status=${dbCurrentStatus} (optimistic lock)`,
      `UPDATE sal_order SET status=${dbStatus}, update_time=NOW() WHERE id=${id} AND status=${dbCurrentStatus} (optimistic lock)`,
      { id, status, currentStatus },
      `affected=${affected}`,
      nowMs() - t0
    );
    return affected;
  }

  /**
   * updateShippedQty - 更新明细已发货数量（映射到 delivered_qty 列）
   */
  async updateShippedQty(lineId: number, shippedQty: number): Promise<void> {
    const t0 = nowMs();
    await drizzleDb
      .update(salOrderDetail)
      .set({ deliveredQty: shippedQty.toString() })
      .where(eq(salOrderDetail.id, lineId));
    logOp(
      'updateShippedQty',
      'sal_order_detail (UPDATE)',
      `id=${lineId}`,
      `UPDATE sal_order_detail SET delivered_qty=${shippedQty} WHERE id=${lineId}`,
      { lineId, shippedQty },
      'done',
      nowMs() - t0
    );
  }

  /**
   * updateAuditInfo - 更新审核信息
   * 注意：sal_order 表无 audit_by/audit_time 列，此方法为接口兼容保留，
   * 实际无操作。如需审核追踪，应通过领域事件或新增列实现。
   */
  async updateAuditInfo(id: number, auditBy: number, auditTime: string): Promise<void> {
    const t0 = nowMs();
    await drizzleDb.update(salOrder).set({ updateTime: new Date() }).where(eq(salOrder.id, id));
    logOp(
      'updateAuditInfo',
      'sal_order (UPDATE)',
      `id=${id}`,
      `UPDATE sal_order SET update_time=NOW() WHERE id=${id} (NOTE: sal_order has no audit_by/audit_time columns; no-op for audit fields)`,
      { id, auditBy, auditTime },
      'done',
      nowMs() - t0
    );
  }

  /**
   * softDelete - 软删除
   */
  async softDelete(id: number): Promise<void> {
    const t0 = nowMs();
    await drizzleDb
      .update(salOrder)
      .set({ deleted: true, updateTime: new Date() })
      .where(eq(salOrder.id, id));
    logOp(
      'softDelete',
      'sal_order (UPDATE)',
      `id=${id}`,
      `UPDATE sal_order SET deleted=true, update_time=NOW() WHERE id=${id}`,
      { id },
      'done',
      nowMs() - t0
    );
  }

  /**
   * mapToProps - DB 行映射到 SalesOrderProps
   * 处理 SalesOrder 聚合与实际 DB 表的字段缺口
   */
  private mapToProps(order: SalOrderRow, details: SalOrderDetailRow[]): SalesOrderProps {
    let statusValue: SalesStatus;
    try {
      statusValue = SalesOrderStatus.fromDbCode(order.status ?? 0).value;
    } catch {
      statusValue = 'draft';
    }

    return {
      id: order.id,
      orderNo: order.orderNo,
      status: statusValue,
      customerId: order.customerId,
      customerName: order.contactName ?? '',
      orderDate: order.orderDate ? String(order.orderDate) : '',
      deliveryDate: order.deliveryDate ? String(order.deliveryDate) : '',
      totalAmount: order.totalAmount ? Number(order.totalAmount) : 0,
      totalQuantity: details.reduce((sum, d) => sum + Number(d.quantity ?? 0), 0),
      warehouseId: 1,
      remark: order.remark ?? '',
      createBy: order.createBy ?? undefined,
      auditBy: undefined,
      auditTime: undefined,
      lines: details.map((d, index) => ({
        id: d.id,
        orderId: d.orderId,
        lineNo: index + 1,
        materialId: d.materialId,
        materialCode: '',
        materialName: d.materialName ?? '',
        specification: '',
        unit: d.unit ?? '件',
        orderQty: Number(d.quantity ?? 0),
        shippedQty: Number(d.deliveredQty ?? 0),
        unitPrice: Number(d.unitPrice ?? 0),
        amount: Number(d.amount ?? 0),
        remark: d.remark ?? undefined,
      })),
      createTime: order.createTime ? String(order.createTime) : undefined,
      updateTime: order.updateTime ? String(order.updateTime) : undefined,
    };
  }
}
