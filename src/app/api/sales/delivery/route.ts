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
    const order = await queryOne('SELECT * FROM sal_delivery_order WHERE id = ? AND deleted = 0', [parseInt(id)]);
    if (!order) return commonErrors.notFound('送货单不存在');
    const items = await query('SELECT * FROM sal_delivery_order_item WHERE delivery_id = ?', [parseInt(id)]);
    return successResponse({ ...order, items });
  }

  let sql = `SELECT d.*, c.customer_name
    FROM sal_delivery_order d
    LEFT JOIN crm_customer c ON d.customer_id = c.id
    WHERE d.deleted = 0`;
  const values: any[] = [];

  if (keyword) {
    sql += ' AND (d.delivery_no LIKE ? OR d.customer_name LIKE ? OR d.order_no LIKE ?)';
    const like = `%${keyword}%`;
    values.push(like, like, like);
  }
  if (status) {
    sql += ' AND d.status = ?';
    values.push(parseInt(status));
  }

  sql += ' ORDER BY d.create_time DESC LIMIT ? OFFSET ?';
  values.push(pageSize, (page - 1) * pageSize);

  const list = await query(sql, values);

  const countSql = `SELECT COUNT(*) as total FROM sal_delivery_order WHERE deleted = 0`;
  const countResult = await queryOne(countSql) as any;

  return successResponse({ list, total: countResult?.total || 0, page, pageSize });
}, '获取送货单列表失败');

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const validation = validateRequestBody(body, ['customer_id', 'items']);
  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  const result = await transaction(async (conn) => {
    const { order_id, order_no, customer_id, customer_name, delivery_date, contact_name, contact_phone, delivery_address, warehouse_id, logistics_company, tracking_no, remark, items } = body;

    const deliveryNo = `DN${Date.now()}`;

    let totalQty = 0, totalAmount = 0;
    for (const item of items) {
      totalQty += parseFloat(item.quantity) || 0;
      totalAmount += (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
    }

    await conn.execute(
      `INSERT INTO sal_delivery_order (delivery_no, order_id, order_no, customer_id, customer_name, delivery_date, contact_name, contact_phone, delivery_address, warehouse_id, logistics_company, tracking_no, total_qty, total_amount, status, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [deliveryNo, order_id || null, order_no || null, customer_id, customer_name || null, delivery_date || null, contact_name || null, contact_phone || null, delivery_address || null, warehouse_id || null, logistics_company || null, tracking_no || null, totalQty, totalAmount, remark || null]
    );

    const [rows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
    const deliveryId = rows[0].id;

    for (const item of items) {
      await conn.execute(
        `INSERT INTO sal_delivery_order_item (delivery_id, material_id, material_name, material_spec, quantity, unit, unit_price, amount, batch_no)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [deliveryId, item.material_id, item.material_name || null, item.material_spec || null, item.quantity, item.unit || null, item.unit_price || null, (item.quantity || 0) * (item.unit_price || 0), item.batch_no || null]
      );
    }

    if (order_id) {
      await conn.execute(
        `UPDATE sal_order_detail SET delivered_qty = delivered_qty + ? WHERE order_id = ? AND material_id = ?`,
        [totalQty, order_id, items[0]?.material_id || 0]
      );
    }

    return { id: deliveryId, delivery_no: deliveryNo };
  });

  return successResponse(result, '送货单创建成功');
}, '创建送货单失败');

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  if (!body.id) return commonErrors.badRequest('送货单ID不能为空');

  const existing = await queryOne('SELECT id, status FROM sal_delivery_order WHERE id = ? AND deleted = 0', [body.id]);
  if (!existing) return commonErrors.notFound('送货单不存在');

  if (body.status !== undefined) {
    await execute('UPDATE sal_delivery_order SET status = ? WHERE id = ?', [body.status, body.id]);

    if (body.status === 3) {
      await execute(
        `UPDATE sal_delivery_order SET sign_status = 1, sign_person = ?, sign_time = NOW() WHERE id = ?`,
        [body.sign_person || '系统', body.id]
      );
    }
  } else {
    const fields: string[] = [];
    const values: any[] = [];
    const allowedFields = ['contact_name', 'contact_phone', 'delivery_address', 'logistics_company', 'tracking_no', 'remark'];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(body[field]);
      }
    }
    if (fields.length > 0) {
      values.push(body.id);
      await execute(`UPDATE sal_delivery_order SET ${fields.join(', ')} WHERE id = ?`, values);
    }
  }

  return successResponse(null, '送货单更新成功');
}, '更新送货单失败');

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return commonErrors.badRequest('送货单ID不能为空');

  const existing = await queryOne('SELECT id, status FROM sal_delivery_order WHERE id = ? AND deleted = 0', [parseInt(id)]);
  if (!existing) return commonErrors.notFound('送货单不存在');

  if ((existing as any).status >= 2) {
    return errorResponse('已发货的送货单不能删除', 400, 400);
  }

  await execute('UPDATE sal_delivery_order SET deleted = 1 WHERE id = ?', [parseInt(id)]);
  return successResponse(null, '送货单删除成功');
}, '删除送货单失败');
