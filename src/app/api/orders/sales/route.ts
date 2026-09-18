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
import { secureLog } from '@/lib/logger';
import { checkMaterialsCategorized } from '@/lib/category-validation';
import {
  SalesOrderStatusCode,
  isTerminalSalesOrderStatus,
  normalizeSalesOrderStatus,
} from '@/lib/order-status';
import type { DbRow } from '@/types/db';

export const GET = withPermission(async (request: NextRequest, _user: UserInfo) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const keyword = searchParams.get('keyword');
  const status = searchParams.get('status');

  let whereClause = 'WHERE so.deleted = 0';
  const params: SqlValue[] = [];

  if (keyword) {
    whereClause += ' AND (so.order_no LIKE ? OR c.customer_name LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (status) {
    whereClause += ' AND so.status = ?';
    params.push(parseInt(status));
  }

  const totalRows = await query(
    `SELECT COUNT(*) as total FROM sal_order so LEFT JOIN crm_customer c ON so.customer_id = c.id ${whereClause}`,
    params
  );
  const total = totalRows[0]?.total || 0;

  const rows = await query(
    `SELECT so.*, c.customer_name
     FROM sal_order so
     LEFT JOIN crm_customer c ON so.customer_id = c.id
     ${whereClause}
     ORDER BY so.create_time DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

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
    total_amount: parseFloat(order.total_amount || '0'),
    total_with_tax: parseFloat(order.total_with_tax || '0'),
    currency: order.currency || 'CNY',
    exchange_rate: parseFloat(order.exchange_rate || '1'),
    base_currency: order.base_currency || 'CNY',
    base_total_amount: parseFloat(order.base_total_amount || '0'),
    base_tax_amount: parseFloat(order.base_tax_amount || '0'),
    base_grand_total: parseFloat(order.base_grand_total || '0'),
    status: order.status,
    remark: order.remark,
    create_time: order.create_time,
  }));

  // 附带每单的订单明细（页面「生成工单」与展开明细依赖 order.items）
  const orderIds = list.map((o) => o.id);
  const itemsByOrder: Record<number, DbRow[]> = {};
  if (orderIds.length > 0) {
    const items = await query<DbRow>(
      `SELECT * FROM sal_order_item WHERE order_id IN (?) AND deleted = 0 ORDER BY id`,
      [orderIds]
    );
    items.forEach((it) => {
      (itemsByOrder[Number(it.order_id)] ||= []).push(it);
    });
  }
  const listWithItems = list.map((o) => ({ ...o, items: itemsByOrder[o.id] || [] }));

  return successResponse({ list: listWithItems, total, page, pageSize });
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
    const materialIds = (items as DbRow[]).map((item: DbRow) => item.material_id).filter(Boolean);
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

    const order_no = 'SO' + Date.now();

    const result = await execute(
      `INSERT INTO sal_order (
      order_no, customer_id, order_date, delivery_date, status,
      salesman_id, payment_terms, contract_no, remark,
      currency, create_by, create_time, update_time, deleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)`,
      [
        order_no,
        customer_id,
        order_date || new Date().toISOString().slice(0, 10),
        delivery_date || null,
        // 契约：1-待确认, 2-已确认, 3-部分发货, 4-已完成, 5-已取消（见 src/lib/order-status.ts）
        SalesOrderStatusCode.PENDING,
        user.userId,
        payment_terms || null,
        contract_no || null,
        remark || null,
        currency || null,
        user.userId,
      ]
    );

    const orderId = result.insertId;

    let totalAmount = 0;
    for (const item of items) {
      const amount = (item.quantity || 0) * (item.unit_price || 0);
      totalAmount += amount;

      await execute(
        `INSERT INTO sal_order_item (
        order_id, material_id, material_code, material_name,
        quantity, unit_price, total_price, unit, remark, create_time, deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,
        [
          orderId,
          item.material_id,
          item.material_code || '',
          item.material_name || '',
          item.quantity,
          item.unit_price || 0,
          amount,
          item.unit || '',
          item.remark || null,
        ]
      );
    }

    await execute(`UPDATE sal_order SET total_amount = ?, total_with_tax = ? WHERE id = ?`, [
      totalAmount,
      totalAmount * 1.13,
      orderId,
    ]);

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

      default:
        return errorResponse(ts('k_ztn3ax'), 400, 400);
    }
  },
  { logTitle: '更新销售订单状态', logType: 'business' }
);
