import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { UserInfo } from '@/lib/api-auth';
import { withPermission } from '@/lib/api-permissions';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import {
  SalesOrderApprovedEvent,
  SalesOrderSubmittedEvent,
} from '@/domain/sales/events/SalesOrderEvents';
import { secureLog, logger } from '@/lib/logger';
import { checkMaterialsCategorized } from '@/lib/category-validation';
import {
  SalesOrderStatusCode,
  isTerminalSalesOrderStatus,
  normalizeSalesOrderStatus,
} from '@/lib/order-status';
import type { DbRow } from '@/types/db';
import type { ResultSetHeader } from 'mysql2';
import { generateDocNo } from '@/lib/global-config';
import { getDefaultTaxRate } from '@/lib/sales-config';
import { numericFilter } from '@/lib/query-filter';

export const GET = withPermission(async (request: NextRequest, _user: UserInfo) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const keyword = searchParams.get('keyword');
  const status = numericFilter(searchParams.get('status'));

  let whereClause = 'WHERE so.deleted = 0';
  const params: SqlValue[] = [];

  if (keyword) {
    whereClause += ' AND (so.order_no LIKE ? OR c.customer_name LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (status) {
    whereClause += ' AND so.status = ?';
    params.push(status);
  }

  const t0 = Date.now();
  const totalRows = await query(
    `SELECT COUNT(*) as total FROM sal_order so LEFT JOIN crm_customer c ON so.customer_id = c.id ${whereClause}`,
    params
  );
  logger.db({ module: 'SalesOrder', action: 'GET list' }, 'COUNT', 'sal_order', {
    elapsedMs: Date.now() - t0,
    keyword: keyword ?? undefined,
    status: status ?? undefined,
  });
  const total = totalRows[0]?.total || 0;

  const t1 = Date.now();
  const rows = await query(
    `SELECT so.id, so.order_no, so.order_date, so.customer_id, so.contact_name, so.contact_phone,
            so.delivery_address, so.delivery_date, so.total_amount, so.tax_amount, so.total_with_tax,
            so.discount_amount, so.currency, so.exchange_rate, so.base_total_amount,
            so.base_tax_amount, so.base_grand_total, so.payment_terms, so.contract_no,
            so.status, so.remark, so.create_time, c.customer_name
     FROM sal_order so
     LEFT JOIN crm_customer c ON so.customer_id = c.id
     ${whereClause}
     ORDER BY so.create_time DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );
  logger.db({ module: 'SalesOrder', action: 'GET list' }, 'SELECT', 'sal_order', {
    elapsedMs: Date.now() - t1,
    page,
    pageSize,
    rowCount: rows.length,
  });
  const list = (rows as DbRow[]).map((order: DbRow) => ({
      id: order.id,
      order_no: order.order_no,
      order_date: order.order_date,
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      contact_name: order.contact_name,
      contact_phone: order.contact_phone,
      delivery_address: order.delivery_address,
      delivery_date: order.delivery_date,
      total_amount: parseFloat(String(order.total_amount ?? 0)),
      total_with_tax: parseFloat(String(order.total_with_tax ?? 0)),
      tax_amount: parseFloat(String(order.tax_amount ?? 0)),
      currency: order.currency || 'CNY',
      exchange_rate: parseFloat(String(order.exchange_rate ?? 1)),
      base_currency: order.currency || 'CNY',
      base_total_amount: parseFloat(String(order.base_total_amount ?? 0)),
      base_tax_amount: parseFloat(String(order.base_tax_amount ?? 0)),
      base_grand_total: parseFloat(String(order.base_grand_total ?? 0)),
      status: order.status,
      remark: order.remark,
      create_time: order.create_time,
    }));

  // 附带每单的订单明细（页面「生成工单」与展开明细依赖 order.items）
  const orderIds = list.map((o) => o.id);
  const itemsByOrder: Record<number, DbRow[]> = {};
  if (orderIds.length > 0) {
    const t2 = Date.now();
    const items = await query<DbRow>(
      `SELECT id, order_id, material_id, material_code, material_name, quantity, unit, unit_price, total_price, remark, deleted
       FROM sal_order_item WHERE order_id IN (?) AND deleted = 0 ORDER BY id`,
      [orderIds]
    );
    logger.db({ module: 'SalesOrder', action: 'GET list' }, 'SELECT', 'sal_order_item', {
      elapsedMs: Date.now() - t2,
      orderCount: orderIds.length,
      itemRowCount: items.length,
    });
    items.forEach((it) => {
      (itemsByOrder[Number(it.order_id)] ||= []).push(it);
    });
  }
  const listWithItems = list.map((o) => ({ ...o, items: itemsByOrder[Number(o.id)] || [] }));

  // 统计摘要：按状态分组 count + amount
  const t3 = Date.now();
  const summaryRows = await query<DbRow>(
    `SELECT so.status, COUNT(*) as cnt, COALESCE(SUM(so.total_amount), 0) as amt
     FROM sal_order so
     LEFT JOIN crm_customer c ON so.customer_id = c.id
     WHERE so.deleted = 0
       ${keyword ? "AND (so.order_no LIKE ? OR c.customer_name LIKE ?)" : ""}
       ${status ? "AND so.status = ?" : ""}
     GROUP BY so.status`,
    keyword && status
      ? [`%${keyword}%`, `%${keyword}%`, status]
      : keyword
      ? [`%${keyword}%`, `%${keyword}%`]
      : status
      ? [status]
      : []
  );
  logger.db({ module: 'SalesOrder', action: 'GET list' }, 'SELECT', 'sal_order', {
    elapsedMs: Date.now() - t3,
    groupBy: 'status',
    rowCount: summaryRows.length,
  });
  const summary = (summaryRows as DbRow[]).map((r) => ({
    status: Number(r.status),
    count: Number(r.cnt),
    amount: parseFloat(String(r.amt ?? 0)),
  }));

  return successResponse({ list: listWithItems, total, page, pageSize, summary });
});

export const POST = withPermission(
  async (request: NextRequest, user: UserInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const {
      customer_id,
      customer_name: _customer_name,
      order_date,
      delivery_date,
      items,
      remark,
      payment_terms,
      contract_no,
      currency,
    } = body;

    if (!customer_id || !items || items.length === 0) {
      return errorResponse(ts('k_1odtqpx'), 400, 400);
    }

    // 系统设置 category.require_on_business：销售订单要求物料已归类
    const materialIds = (items as DbRow[]).map((item: DbRow) => Number(item.material_id)).filter((id): id is number => Number.isInteger(id) && id > 0);
    secureLog('info', ts('k_cfmbx8'), {
      itemCount: items.length,
      materialIds,
    });
    const categoryCheck = await checkMaterialsCategorized(materialIds);
    secureLog('info', ts('k_rhfnp1'), {
      blocked: categoryCheck.blocked,
      uncategorizedCount: categoryCheck.uncategorized.length,
    });
    if (categoryCheck.blocked) {
      secureLog('warn', ts('k_14l170t'), {
        message: categoryCheck.message,
      });
      return errorResponse(categoryCheck.message!, 400, 400);
    }
    if (categoryCheck.message) {
      secureLog('warn', ts('k_1xuziy5'), {
        message: categoryCheck.message,
      });
    }

    const order_no = generateDocNo('SO');

    // P0-1：读取可配置税率（sys_config.finance.tax_rate，默认 13%）
    const taxRate = await getDefaultTaxRate();

    // 先算总金额（明细累加），避免事务内多次计算
    let totalAmount = 0;
    for (const item of items) {
      const amount = (item.quantity || 0) * (item.unit_price || 0);
      totalAmount += amount;
    }
    const totalWithTax = totalAmount * (1 + taxRate);
    const taxAmount = totalWithTax - totalAmount;

    // P0-2：整个创建流程包裹在事务里
    // 原代码：主表 INSERT → 明细循环 INSERT → 独立 UPDATE total_amount
    // 问题：明细插入失败会留下孤儿主单；UPDATE 失败主单金额为零
    const orderId: number = await transaction(async (conn) => {
      // 1) 主表 INSERT — 显式 <ResultSetHeader> 泛型以正确取 insertId
      const [orderRes] = await conn.execute<ResultSetHeader>(
        `INSERT INTO sal_order (
          order_no, customer_id, order_date, delivery_date, status,
          salesman_id, payment_terms, contract_no, remark,
          currency, total_amount, total_with_tax, tax_amount,
          create_by, create_time, update_time, deleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)`,
        [
          order_no,
          customer_id,
          order_date || new Date().toISOString().slice(0, 10),
          delivery_date || null,
          SalesOrderStatusCode.PENDING,
          user.userId,
          payment_terms || null,
          contract_no || null,
          remark || null,
          currency || null,
          totalAmount,
          totalWithTax,
          taxAmount,
          user.userId,
        ]
      );
      const id = Number(orderRes.insertId);

      // 2) 明细循环 INSERT（事务内）
      for (const item of items) {
        await conn.execute(
          `INSERT INTO sal_order_item (
            order_id, material_id, material_code, material_name,
            quantity, unit_price, total_price, unit, remark, create_time, deleted
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,
          [
            id,
            item.material_id,
            item.material_code || '',
            item.material_name || '',
            item.quantity,
            item.unit_price || 0,
            (item.quantity || 0) * (item.unit_price || 0),
            item.unit || '',
            item.remark || null,
          ]
        );
      }

      return id;
    });

    return successResponse(
      {
        id: orderId,
        order_no,
        // 契约码，与库内一致。原先返回字符串 'draft'，与库里的 tinyint 1 表达同一件事却两种类型，
        // 调用方无法比较（BUG-ORD-002）。
        status: SalesOrderStatusCode.PENDING,
        uncategorizedMaterials: categoryCheck.uncategorized,
      },
      categoryCheck.message ? `销售订单创建成功。${categoryCheck.message}` : ts('k_ehi1sy')
    );
  },
  { logTitle: '创建销售订单', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, user: UserInfo) => {
  const tc = await getTranslations('Common');
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { id, action } = body;

    if (!id) {
      return errorResponse(ts('k_jibosn'), 400, 400);
    }

    if (body.currency !== undefined) {
      return errorResponse(tc('currencyImmutableWarning'), 400, 400);
    }
    if (body.exchange_rate !== undefined) {
      return errorResponse(ts('k_zgrm21'), 400, 400);
    }

    const order = await queryOne('SELECT * FROM sal_order WHERE id = ? AND deleted = 0', [id]);

    if (!order) {
      return errorResponse(ts('k_2v2qxr'), 404, 404);
    }

    // 统一按契约码判定（历史码 0/10/20/… 归一到 1..5），修复前直接与字面量比较。
    const currentStatus = normalizeSalesOrderStatus(order.status);

    switch (action) {
      case 'submit':
        // 待确认 → 已确认
        if (currentStatus !== SalesOrderStatusCode.PENDING) {
          return errorResponse(ts('k_10t3a8m'), 400, 400);
        }

        await transaction(async (conn) => {
          await conn.execute('UPDATE sal_order SET status = ?, update_time = NOW() WHERE id = ?', [
            SalesOrderStatusCode.CONFIRMED,
            id,
          ]);
          await getDomainEventOutbox().saveEvents(conn, 'SalesOrder', id, [
            new SalesOrderSubmittedEvent({
              orderId: order.id,
              orderNo: order.order_no,
            }),
          ]);
        });

        secureLog('info', 'Sales order submitted', { orderId: id, orderNo: order.order_no });

        return successResponse({ status: SalesOrderStatusCode.CONFIRMED }, ts('k_1isjr5e'));

      case 'approve':
        // 「审核通过」在本契约里**没有独立状态**：通过即「已确认」（2）。
        // 修复前此处写 status = 3，而 3 的契约含义是「部分发货」——
        // 导致审核过的订单在列表与导出里显示为「部分发货」且永远发不出货（BUG-ORD-002）。
        // 同时修复前 UPDATE 还写了 audit_by / audit_time，而 sal_order 并不存在这两列，
        // 语句必然报 Unknown column → 该分支 500。
        if (isTerminalSalesOrderStatus(currentStatus)) {
          return errorResponse(ts('k_1tfnqbu'), 400, 400);
        }

        const lines = await query(
          'SELECT * FROM sal_order_item WHERE order_id = ? AND deleted = 0',
          [id]
        );

        await transaction(async (conn) => {
          await conn.execute(
            'UPDATE sal_order SET status = ?, update_time = NOW() WHERE id = ?',
            [SalesOrderStatusCode.CONFIRMED, id]
          );
          await getDomainEventOutbox().saveEvents(conn, 'SalesOrder', id, [
            new SalesOrderApprovedEvent({
              orderId: order.id,
              orderNo: order.order_no,
              customerId: order.customer_id,
              customerName: order.customer_name,
              lines: lines.map((l) => ({
                materialId: l.material_id,
                materialCode: l.material_code,
                materialName: l.material_name,
                orderQty: l.quantity,
                unitPrice: parseFloat(l.unit_price),
                remainingQty: l.quantity,
              })),
              totalAmount: parseFloat(order.total_amount),
            }),
          ]);
        });

        secureLog('info', 'Sales order approved, work order creation triggered', {
          orderId: id,
          orderNo: order.order_no,
          lineCount: lines.length,
        });

        return successResponse({ status: SalesOrderStatusCode.CONFIRMED }, ts('k_j1hdld'));

      case 'reject':
        // 已确认 → 退回待确认
        if (currentStatus !== SalesOrderStatusCode.CONFIRMED) {
          return errorResponse(ts('k_bekxqy'), 400, 400);
        }

        await execute('UPDATE sal_order SET status = ?, update_time = NOW() WHERE id = ?', [
          SalesOrderStatusCode.PENDING,
          id,
        ]);

        return successResponse({ status: SalesOrderStatusCode.PENDING }, ts('k_uptysj'));

      case 'cancel':
        // 取消订单 → status=5（已取消）
        // 规则：
        // - 1(待确认) → 直接允许
        // - 2(已确认) → 需检查下游出库单是否已创建
        // - ≥3(部分发货/已完成) → 禁止，必须走退货流程
        if (currentStatus === SalesOrderStatusCode.CANCELLED) {
          return errorResponse(ts('k_1tfnqbu'), 400, 400);
        }
        if (
          currentStatus === SalesOrderStatusCode.PARTIALLY_SHIPPED ||
          currentStatus === SalesOrderStatusCode.COMPLETED
        ) {
          return errorResponse(ts('k_ord_cannot_cancel_shipped'), 400, 400);
        }
        if (currentStatus === SalesOrderStatusCode.CONFIRMED) {
          // 检查下游 inv_outbound_order 是否已关联 sales_order_no
          const [outboundRows] = await query<{ cnt: number }>(
            `SELECT COUNT(*) as cnt FROM inv_outbound_order
             WHERE sales_order_no = ? AND deleted = 0`,
            [order.order_no]
          );
          const cnt = Number((outboundRows as unknown as { cnt: number }[])[0]?.cnt ?? 0);
          if (cnt > 0) {
            return errorResponse(ts('k_ord_cannot_cancel_outbound'), 400, 400);
          }
        }

        await transaction(async (conn) => {
          await conn.execute(
            'UPDATE sal_order SET status = ?, update_time = NOW() WHERE id = ?',
            [SalesOrderStatusCode.CANCELLED, id]
          );
        });

        secureLog('info', 'Sales order cancelled', { orderId: id, orderNo: order.order_no });
        return successResponse({ status: SalesOrderStatusCode.CANCELLED }, ts('k_ord_cancelled'));

      default:
        return errorResponse(ts('k_ztn3ax'), 400, 400);
    }
  },
  { logTitle: '更新销售订单状态', logType: 'business' }
);
