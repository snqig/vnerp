/**
 * DrizzlePurchaseOrderRepository
 *
 * Drizzle ORM 实现的采购订单仓储，对应 IPurchaseOrderRepository 接口。
 * 字段映射以 database/vnerpdacahng_schema.sql 实际 DDL 为准（与 src/lib/db/schema.ts 一致）。
 *
 * 与 MysqlPurchaseOrderRepository 行为对齐：
 *   - 状态映射：使用 PurchaseOrderStatus.from(domain).toDbCode() / fromDbCode(code)
 *   - 历史脏数据容错：未知状态码降级为 draft 并 warn（与 MysqlPurchaseOrderRepository 一致）
 *   - findById / findByOrderNo / findByStatus / save / updateStatus / updateReceivedQty / updateAuditInfo / softDelete
 *
 * 接入方式：通过 RepositoryRegistry.getPurchaseOrderRepository() 获取实例，
 *   默认 REPOSITORY_IMPL=mysql 时走 MysqlPurchaseOrderRepository。
 */

import { eq, and, like, or, gte, lte, desc, inArray, sql, count } from 'drizzle-orm';
import { drizzleDb } from '@/lib/db';
import { purPurchaseOrder, purPurchaseOrderLine } from '@/lib/db/schema';
import { transaction } from '@/lib/db';
import {
  IPurchaseOrderRepository,
  Pagination,
  PaginatedResult,
} from '@/domain/purchase/repositories/IPurchaseOrderRepository';
import { PurchaseOrder, PurchaseOrderProps } from '@/domain/purchase/aggregates/PurchaseOrder';
import {
  PurchaseOrderStatus,
  PurchaseStatus,
} from '@/domain/purchase/value-objects/PurchaseOrderStatus';
import { generateDocumentNo } from '@/lib/document-numbering';

type PurPurchaseOrderRow = typeof purPurchaseOrder.$inferSelect;
type PurPurchaseOrderLineRow = typeof purPurchaseOrderLine.$inferSelect;

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
    `[DrizzlePurchaseRepo] ${method} (${durationMs}ms)\n` +
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

export class DrizzlePurchaseOrderRepository implements IPurchaseOrderRepository {
  /**
   * findById - 按 ID 查询采购订单 + 明细行
   */
  async findById(id: number): Promise<PurchaseOrder | null> {
    const t0 = nowMs();
    const sqlDesc = `SELECT * FROM pur_purchase_order WHERE id=${id} AND deleted=false LIMIT 1`;
    const order = await drizzleDb.query.purPurchaseOrder.findFirst({
      where: and(eq(purPurchaseOrder.id, id), eq(purPurchaseOrder.deleted, false)),
    });

    if (!order) {
      logOp(
        'findById',
        'pur_purchase_order',
        `id=${id} AND deleted=false`,
        sqlDesc,
        { id },
        'null (not found)',
        nowMs() - t0
      );
      return null;
    }

    const linesSqlDesc = `SELECT * FROM pur_purchase_order_line WHERE po_id=${id} ORDER BY line_no`;
    const lines = await drizzleDb.query.purPurchaseOrderLine.findMany({
      where: eq(purPurchaseOrderLine.poId, id),
      orderBy: (t) => t.lineNo,
    });

    const result = PurchaseOrder.reconstitute(this.mapToProps(order, lines));
    logOp(
      'findById',
      'pur_purchase_order + pur_purchase_order_line',
      `id=${id} AND deleted=false`,
      `${sqlDesc}; ${linesSqlDesc}`,
      { id },
      `order+${lines.length} lines`,
      nowMs() - t0
    );
    return result;
  }

  /**
   * findByOrderNo - 按订单号查询
   */
  async findByOrderNo(orderNo: string): Promise<PurchaseOrder | null> {
    const t0 = nowMs();
    const sqlDesc = `SELECT * FROM pur_purchase_order WHERE po_no='${orderNo}' AND deleted=false LIMIT 1`;
    const order = await drizzleDb.query.purPurchaseOrder.findFirst({
      where: and(eq(purPurchaseOrder.poNo, orderNo), eq(purPurchaseOrder.deleted, false)),
    });

    if (!order) {
      logOp(
        'findByOrderNo',
        'pur_purchase_order',
        `po_no='${orderNo}' AND deleted=false`,
        sqlDesc,
        { orderNo },
        'null (not found)',
        nowMs() - t0
      );
      return null;
    }

    const lines = await drizzleDb.query.purPurchaseOrderLine.findMany({
      where: eq(purPurchaseOrderLine.poId, order.id),
      orderBy: (t) => t.lineNo,
    });

    const result = PurchaseOrder.reconstitute(this.mapToProps(order, lines));
    logOp(
      'findByOrderNo',
      'pur_purchase_order + pur_purchase_order_line',
      `po_no='${orderNo}' AND deleted=false`,
      `${sqlDesc}; SELECT * FROM pur_purchase_order_line WHERE po_id=${order.id}`,
      { orderNo },
      `order+${lines.length} lines`,
      nowMs() - t0
    );
    return result;
  }

  /**
   * findByStatus - 分页列表 + 动态过滤 + 批量加载明细行
   */
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
    const t0 = nowMs();
    const conditions = [eq(purPurchaseOrder.deleted, false)];

    if (status && status !== 'all') {
      const dbCode = PurchaseOrderStatus.from(status).toDbCode();
      conditions.push(eq(purPurchaseOrder.status, dbCode));
    }

    if (filters?.keyword) {
      const kw = `%${filters.keyword}%`;
      conditions.push(
        or(like(purPurchaseOrder.poNo, kw), like(purPurchaseOrder.supplierName, kw))!
      );
    }

    if (filters?.supplierId) {
      conditions.push(eq(purPurchaseOrder.supplierId, filters.supplierId));
    }

    if (filters?.startDate) {
      conditions.push(gte(purPurchaseOrder.orderDate, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      conditions.push(lte(purPurchaseOrder.orderDate, new Date(filters.endDate)));
    }

    const where = and(...conditions);

    const totalRow = await drizzleDb.select({ total: count() }).from(purPurchaseOrder).where(where);
    const total = totalRow[0]?.total ?? 0;

    const orders = await drizzleDb
      .select()
      .from(purPurchaseOrder)
      .where(where)
      .orderBy(desc(purPurchaseOrder.createTime))
      .limit(pagination.pageSize)
      .offset((pagination.page - 1) * pagination.pageSize);

    if (orders.length === 0) {
      logOp(
        'findByStatus',
        'pur_purchase_order',
        `deleted=false AND status=${status} LIMIT ${pagination.pageSize} OFFSET ${(pagination.page - 1) * pagination.pageSize}`,
        `SELECT * FROM pur_purchase_order WHERE deleted=false AND status=${status} LIMIT ${pagination.pageSize} OFFSET ${(pagination.page - 1) * pagination.pageSize}`,
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
    const allLines = await drizzleDb.query.purPurchaseOrderLine.findMany({
      where: inArray(purPurchaseOrderLine.poId, orderIds),
      orderBy: (t) => t.lineNo,
    });

    const linesMap = new Map<number, PurPurchaseOrderLineRow[]>();
    for (const line of allLines) {
      const list = linesMap.get(line.poId) ?? [];
      list.push(line);
      linesMap.set(line.poId, list);
    }

    const data = orders.map((o) =>
      PurchaseOrder.reconstitute(this.mapToProps(o, linesMap.get(o.id) ?? []))
    );

    logOp(
      'findByStatus',
      'pur_purchase_order + pur_purchase_order_line',
      `deleted=false AND status=${status} LIMIT ${pagination.pageSize} OFFSET ${(pagination.page - 1) * pagination.pageSize}`,
      `SELECT * FROM pur_purchase_order WHERE deleted=false AND status=${status} LIMIT ${pagination.pageSize} OFFSET ${(pagination.page - 1) * pagination.pageSize}; SELECT * FROM pur_purchase_order_line WHERE po_id IN (${orderIds.join(',')})`,
      { status, pagination, filters },
      `${orders.length} orders, ${allLines.length} lines, total=${total}`,
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
   * save - 事务插入主表 + 批量插入明细行
   */
  async save(order: PurchaseOrder): Promise<{ id: number; orderNo: string }> {
    const t0 = nowMs();
    const orderNo = await generateDocumentNo('purchase_order');

    const result = await transaction(async (conn) => {
      const [orderResult]: any = await conn.execute(
        `INSERT INTO pur_purchase_order
         (po_no, supplier_id, supplier_name, supplier_code, order_date, delivery_date,
          currency, exchange_rate, total_amount, total_quantity, tax_rate, tax_amount, grand_total,
          status, over_receipt_tolerance, payment_terms, delivery_address, remark, create_by, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          orderNo,
          order.supplierId,
          order.supplierName,
          order.supplierCode || null,
          order.orderDate,
          order.deliveryDate || null,
          order.currency || 'CNY',
          order.exchangeRate || 1.0,
          order.totalAmount,
          order.totalQuantity,
          order.taxRate,
          order.taxAmount,
          order.grandTotal,
          order.status.toDbCode(),
          order.overReceiptTolerance || 0,
          order.paymentTerms || null,
          order.deliveryAddress || null,
          order.remark || null,
          order.createBy || null,
        ]
      );
      const orderId = orderResult.insertId;

      for (const line of order.lines) {
        await conn.execute(
          `INSERT INTO pur_purchase_order_line
           (po_id, line_no, material_id, material_code, material_name, material_spec,
            unit, order_qty, received_qty, returned_qty, unit_price, amount,
            tax_rate, tax_amount, line_total, require_date, remark, create_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            orderId,
            line.lineNo,
            line.materialId,
            line.materialCode,
            line.materialName,
            line.materialSpec || null,
            line.unit || '件',
            line.orderQty,
            line.receivedQty || 0,
            line.returnedQty || 0,
            line.unitPrice,
            line.amount,
            line.taxRate || 13,
            line.taxAmount || 0,
            line.lineTotal || 0,
            line.requireDate || null,
            line.remark || null,
          ]
        );
      }

      return { id: orderId, orderNo };
    });
    logOp(
      'save',
      'pur_purchase_order (INSERT) + pur_purchase_order_line (INSERT)',
      'N/A (new row)',
      `INSERT INTO pur_purchase_order (...) + ${order.lines.length} line inserts (in transaction)`,
      { orderNo, supplierId: order.supplierId, lineCount: order.lines.length },
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
    const dbStatus = PurchaseOrderStatus.from(status).toDbCode();
    const dbCurrentStatus = PurchaseOrderStatus.from(currentStatus).toDbCode();

    const result = await drizzleDb
      .update(purPurchaseOrder)
      .set({ status: dbStatus, updateTime: new Date() })
      .where(and(eq(purPurchaseOrder.id, id), eq(purPurchaseOrder.status, dbCurrentStatus)));

    const affected = (result[0] as any)?.affectedRows > 0;
    logOp(
      'updateStatus',
      'pur_purchase_order (UPDATE)',
      `id=${id} AND status=${dbCurrentStatus} (optimistic lock)`,
      `UPDATE pur_purchase_order SET status=${dbStatus}, update_time=NOW() WHERE id=${id} AND status=${dbCurrentStatus}`,
      { id, status, currentStatus },
      `affected=${affected}`,
      nowMs() - t0
    );
    return affected;
  }

  /**
   * updateReceivedQty - 更新明细行已收货数量
   */
  async updateReceivedQty(lineId: number, receivedQty: number): Promise<void> {
    const t0 = nowMs();
    await drizzleDb
      .update(purPurchaseOrderLine)
      .set({ receivedQty: receivedQty.toString(), updateTime: new Date() })
      .where(eq(purPurchaseOrderLine.id, lineId));
    logOp(
      'updateReceivedQty',
      'pur_purchase_order_line (UPDATE)',
      `id=${lineId}`,
      `UPDATE pur_purchase_order_line SET received_qty=${receivedQty}, update_time=NOW() WHERE id=${lineId}`,
      { lineId, receivedQty },
      'done',
      nowMs() - t0
    );
  }

  /**
   * updateAuditInfo - 更新审核信息
   */
  async updateAuditInfo(id: number, auditBy: number, auditTime: string): Promise<void> {
    const t0 = nowMs();
    await drizzleDb
      .update(purPurchaseOrder)
      .set({
        auditBy,
        auditTime: auditTime ? new Date(auditTime.replace(' ', 'T')) : null,
        updateTime: new Date(),
      })
      .where(eq(purPurchaseOrder.id, id));
    logOp(
      'updateAuditInfo',
      'pur_purchase_order (UPDATE)',
      `id=${id}`,
      `UPDATE pur_purchase_order SET audit_by=${auditBy}, audit_time=?, update_time=NOW() WHERE id=${id}`,
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
      .update(purPurchaseOrder)
      .set({ deleted: true, updateTime: new Date() })
      .where(eq(purPurchaseOrder.id, id));
    logOp(
      'softDelete',
      'pur_purchase_order (UPDATE)',
      `id=${id}`,
      `UPDATE pur_purchase_order SET deleted=true, update_time=NOW() WHERE id=${id}`,
      { id },
      'done',
      nowMs() - t0
    );
  }

  /**
   * mapToProps - DB 行映射到 PurchaseOrderProps
   * 历史脏数据容错：未知状态码降级为 draft 并 warn
   */
  private mapToProps(
    order: PurPurchaseOrderRow,
    lines: PurPurchaseOrderLineRow[]
  ): PurchaseOrderProps {
    let statusValue: PurchaseStatus;
    try {
      statusValue = PurchaseOrderStatus.fromDbCode(order.status ?? 10).value;
    } catch {
      console.warn(
        `[DrizzlePurchaseRepository] 未知采购单状态码 status=${order.status} (order id=${order.id}, po_no=${order.poNo})，降级为 draft`
      );
      statusValue = 'draft';
    }

    return {
      id: order.id,
      orderNo: order.poNo,
      status: statusValue,
      supplierId: order.supplierId ?? 0,
      supplierName: order.supplierName ?? '',
      supplierCode: order.supplierCode ?? '',
      orderDate: order.orderDate ? String(order.orderDate) : '',
      deliveryDate: order.deliveryDate ? String(order.deliveryDate) : '',
      currency: order.currency ?? 'CNY',
      exchangeRate: order.exchangeRate ? Number(order.exchangeRate) : 1.0,
      taxRate: order.taxRate ? Number(order.taxRate) : 13,
      totalAmount: order.totalAmount ? Number(order.totalAmount) : 0,
      totalQuantity: order.totalQuantity ? Number(order.totalQuantity) : 0,
      taxAmount: order.taxAmount ? Number(order.taxAmount) : 0,
      grandTotal: order.grandTotal ? Number(order.grandTotal) : 0,
      overReceiptTolerance: order.overReceiptTolerance ? Number(order.overReceiptTolerance) : 0,
      paymentTerms: order.paymentTerms ?? '',
      deliveryAddress: order.deliveryAddress ?? '',
      remark: order.remark ?? '',
      createBy: order.createBy ?? undefined,
      auditBy: order.auditBy ?? undefined,
      auditTime: order.auditTime ? String(order.auditTime) : undefined,
      lines: lines.map((line) => ({
        id: line.id,
        orderId: line.poId,
        lineNo: line.lineNo,
        materialId: line.materialId ?? 0,
        materialCode: line.materialCode ?? '',
        materialName: line.materialName ?? '',
        materialSpec: line.materialSpec ?? '',
        unit: line.unit ?? '件',
        orderQty: Number(line.orderQty ?? 0),
        receivedQty: Number(line.receivedQty ?? 0),
        returnedQty: Number(line.returnedQty ?? 0),
        unitPrice: Number(line.unitPrice ?? 0),
        amount: Number(line.amount ?? 0),
        taxRate: Number(line.taxRate ?? 13),
        taxAmount: Number(line.taxAmount ?? 0),
        lineTotal: Number(line.lineTotal ?? 0),
        requireDate: line.requireDate ? String(line.requireDate) : undefined,
        remark: line.remark ?? undefined,
      })),
      createTime: order.createTime ? String(order.createTime) : undefined,
      updateTime: order.updateTime ? String(order.updateTime) : undefined,
    };
  }
}
