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
      return errorResponse('客户和订单明细不能为空', 400, 400);
    }

    // 系统设置 category.require_on_business：销售订单要求物料已归类
    const materialIds = (items as DbRow[]).map((item: DbRow) => item.material_id).filter(Boolean);
    secureLog('info', '[orders/sales] 开始物料分类校验', {
      itemCount: items.length,
      materialIds,
    });
    const categoryCheck = await checkMaterialsCategorized(materialIds);
    secureLog('info', '[orders/sales] 物料分类校验完成', {
      blocked: categoryCheck.blocked,
      uncategorizedCount: categoryCheck.uncategorized.length,
    });
    if (categoryCheck.blocked) {
      secureLog('warn', '[orders/sales] 物料分类校验阻断提交', {
        message: categoryCheck.message,
      });
      return errorResponse(categoryCheck.message!, 400, 400);
    }
    if (categoryCheck.message) {
      secureLog('warn', '[orders/sales] 物料分类校验警告', {
        message: categoryCheck.message,
      });
    }

    const order_no = 'SO' + Date.now();

    const result = await execute(
      `INSERT INTO sal_order (
      order_no, customer_id, order_date, delivery_date, status,
      salesman_id, payment_terms, contract_no, remark,
      currency, create_by, create_time, update_time, deleted
    ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)`,
      [
        order_no,
        customer_id,
        order_date || new Date().toISOString().slice(0, 10),
        delivery_date || null,
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
        quantity, unit_price, amount, unit, remark, create_time, deleted
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
        status: 'draft',
        uncategorizedMaterials: categoryCheck.uncategorized,
      },
      categoryCheck.message ? `销售订单创建成功。${categoryCheck.message}` : '销售订单创建成功'
    );
  },
  { logTitle: '创建销售订单', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, user: UserInfo) => {
    const body = await request.json();
    const { id, action } = body;

    if (!id) {
      return errorResponse('订单ID不能为空', 400, 400);
    }

    if (body.currency !== undefined) {
      return errorResponse('币种创建后不可修改', 400, 400);
    }
    if (body.exchange_rate !== undefined) {
      return errorResponse('汇率创建后不可修改', 400, 400);
    }

    const order = await queryOne('SELECT * FROM sal_order WHERE id = ? AND deleted = 0', [id]);

    if (!order) {
      return errorResponse('订单不存在', 404, 404);
    }

    switch (action) {
      case 'submit':
        if (order.status !== 1) {
          return errorResponse('只有草稿状态的订单可以提交', 400, 400);
        }

        await transaction(async (conn) => {
          await conn.execute('UPDATE sal_order SET status = 2, update_time = NOW() WHERE id = ?', [
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

        return successResponse({ status: 2 }, '订单已提交');

      case 'approve':
        if (order.status !== 2) {
          return errorResponse('只有已提交的订单可以审核', 400, 400);
        }

        const lines = await query(
          'SELECT * FROM sal_order_item WHERE order_id = ? AND deleted = 0',
          [id]
        );

        await transaction(async (conn) => {
          await conn.execute(
            'UPDATE sal_order SET status = 3, audit_by = ?, audit_time = NOW(), update_time = NOW() WHERE id = ?',
            [user.userId, id]
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

        return successResponse({ status: 3 }, '订单已审核，生产工单生成中');

      case 'reject':
        if (order.status !== 2) {
          return errorResponse('只有已提交的订单可以驳回', 400, 400);
        }

        await execute('UPDATE sal_order SET status = 1, update_time = NOW() WHERE id = ?', [id]);

        return successResponse({ status: 1 }, '订单已驳回');

      default:
        return errorResponse('未知操作', 400, 400);
    }
  },
  { logTitle: '更新销售订单状态', logType: 'business' }
);
