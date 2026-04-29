import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction } from '@/lib/db';
import { successResponse, errorResponse, commonErrors, withErrorHandler, validateRequestBody } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  if (id) {
    const order = await queryOne('SELECT * FROM sal_return_order WHERE id = ? AND deleted = 0', [parseInt(id)]);
    if (!order) return commonErrors.notFound('退货单不存在');
    const items = await query('SELECT * FROM sal_return_order_item WHERE return_id = ?', [parseInt(id)]);
    return successResponse({ ...order, items });
  }

  let sql = `SELECT r.*, c.customer_name
    FROM sal_return_order r
    LEFT JOIN crm_customer c ON r.customer_id = c.id
    WHERE r.deleted = 0`;
  const values: any[] = [];

  if (keyword) {
    sql += ' AND (r.return_no LIKE ? OR r.customer_name LIKE ? OR r.order_no LIKE ?)';
    const like = `%${keyword}%`;
    values.push(like, like, like);
  }
  if (status) {
    sql += ' AND r.status = ?';
    values.push(parseInt(status));
  }

  sql += ' ORDER BY r.create_time DESC LIMIT ? OFFSET ?';
  values.push(pageSize, (page - 1) * pageSize);

  const list = await query(sql, values);

  const countSql = `SELECT COUNT(*) as total FROM sal_return_order WHERE deleted = 0`;
  const countResult = await queryOne(countSql) as any;

  return successResponse({ list, total: countResult?.total || 0, page, pageSize });
}, '获取退货单列表失败');

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const validation = validateRequestBody(body, ['customer_id', 'items']);
  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  const result = await transaction(async (conn) => {
    const { order_id, order_no, delivery_id, delivery_no, customer_id, customer_name, return_date, return_type, return_reason, warehouse_id, remark, items } = body;

    const returnNo = `RT${Date.now()}`;

    let totalQty = 0, totalAmount = 0;
    for (const item of items) {
      totalQty += parseFloat(item.quantity) || 0;
      totalAmount += (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
    }

    await conn.execute(
      `INSERT INTO sal_return_order (return_no, order_id, order_no, delivery_id, delivery_no, customer_id, customer_name, return_date, return_type, return_reason, total_qty, total_amount, warehouse_id, status, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [returnNo, order_id || null, order_no || null, delivery_id || null, delivery_no || null, customer_id, customer_name || null, return_date || null, return_type || 1, return_reason || null, totalQty, totalAmount, warehouse_id || null, remark || null]
    );

    const [rows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
    const returnId = rows[0].id;

    for (const item of items) {
      await conn.execute(
        `INSERT INTO sal_return_order_item (return_id, material_id, material_name, material_spec, quantity, unit, unit_price, amount, batch_no)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [returnId, item.material_id, item.material_name || null, item.material_spec || null, item.quantity, item.unit || null, item.unit_price || null, (item.quantity || 0) * (item.unit_price || 0), item.batch_no || null]
      );
    }

    return { id: returnId, return_no: returnNo };
  });

  return successResponse(result, '退货单创建成功');
}, '创建退货单失败');

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  if (!body.id) return commonErrors.badRequest('退货单ID不能为空');

  const existing = await queryOne('SELECT id, status FROM sal_return_order WHERE id = ? AND deleted = 0', [body.id]);
  if (!existing) return commonErrors.notFound('退货单不存在');

  if (body.status !== undefined) {
    const result = await transaction(async (conn) => {
      await conn.execute('UPDATE sal_return_order SET status = ? WHERE id = ?', [body.status, body.id]);

      if (body.status === 3) {
        const returnOrder = await queryOne('SELECT * FROM sal_return_order WHERE id = ?', [body.id]) as any;
        if (returnOrder && returnOrder.warehouse_id) {
          const items = await query('SELECT * FROM sal_return_order_item WHERE return_id = ?', [body.id]) as any[];
          for (const item of items) {
            await conn.execute(
              `INSERT INTO inv_inventory (warehouse_id, material_id, quantity, status) VALUES (?, ?, ?, 1)
               ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
              [returnOrder.warehouse_id, item.material_id, item.quantity, item.quantity]
            );
            await conn.execute(
              `INSERT INTO inv_inventory_log (warehouse_id, material_id, change_type, change_qty, order_no, remark, create_time)
               VALUES (?, ?, 'in', ?, ?, '退货入库', NOW())`,
              [returnOrder.warehouse_id, item.material_id, item.quantity, returnOrder.return_no]
            );
          }
          await conn.execute('UPDATE sal_return_order SET inbound_status = 1 WHERE id = ?', [body.id]);
        }
      }

      return null;
    });

    return successResponse(result, '退货单状态更新成功');
  }

  const fields: string[] = [];
  const values: any[] = [];
  const allowedFields = ['return_reason', 'remark', 'inspection_status', 'inspection_result'];
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(body[field]);
    }
  }
  if (fields.length > 0) {
    values.push(body.id);
    await execute(`UPDATE sal_return_order SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  return successResponse(null, '退货单更新成功');
}, '更新退货单失败');

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return commonErrors.badRequest('退货单ID不能为空');

  const existing = await queryOne('SELECT id, status FROM sal_return_order WHERE id = ? AND deleted = 0', [parseInt(id)]);
  if (!existing) return commonErrors.notFound('退货单不存在');

  if ((existing as any).status >= 3) {
    return errorResponse('已退货的单据不能删除', 400, 400);
  }

  await execute('UPDATE sal_return_order SET deleted = 1 WHERE id = ?', [parseInt(id)]);
  return successResponse(null, '退货单删除成功');
}, '删除退货单失败');
