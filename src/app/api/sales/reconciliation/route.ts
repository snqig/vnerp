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
    const rc = await queryOne('SELECT * FROM sal_reconciliation WHERE id = ? AND deleted = 0', [parseInt(id)]);
    if (!rc) return commonErrors.notFound('对账单不存在');
    const details = await query('SELECT * FROM sal_reconciliation_detail WHERE reconciliation_id = ?', [parseInt(id)]);
    return successResponse({ ...rc, details });
  }

  let sql = `SELECT r.*, c.customer_name
    FROM sal_reconciliation r
    LEFT JOIN crm_customer c ON r.customer_id = c.id
    WHERE r.deleted = 0`;
  const values: any[] = [];

  if (keyword) {
    sql += ' AND (r.reconciliation_no LIKE ? OR r.customer_name LIKE ?)';
    const like = `%${keyword}%`;
    values.push(like, like);
  }
  if (status) {
    sql += ' AND r.status = ?';
    values.push(parseInt(status));
  }

  sql += ' ORDER BY r.create_time DESC LIMIT ? OFFSET ?';
  values.push(pageSize, (page - 1) * pageSize);

  const list = await query(sql, values);

  const countSql = `SELECT COUNT(*) as total FROM sal_reconciliation WHERE deleted = 0`;
  const countResult = await queryOne(countSql) as any;

  return successResponse({ list, total: countResult?.total || 0, page, pageSize });
}, '获取对账单列表失败');

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const validation = validateRequestBody(body, ['customer_id', 'period_start', 'period_end']);
  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  const result = await transaction(async (conn) => {
    const { customer_id, customer_name, period_start, period_end, remark } = body;

    const reconciliationNo = `RC${Date.now()}`;

    let deliveryAmount = 0;
    let returnAmount = 0;

    const deliveries = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM sal_delivery_order WHERE customer_id = ? AND delivery_date BETWEEN ? AND ? AND deleted = 0 AND status >= 2`,
      [customer_id, period_start, period_end]
    ) as any[];
    deliveryAmount = deliveries[0]?.total || 0;

    const returns = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM sal_return_order WHERE customer_id = ? AND return_date BETWEEN ? AND ? AND deleted = 0 AND status >= 2`,
      [customer_id, period_start, period_end]
    ) as any[];
    returnAmount = returns[0]?.total || 0;

    const netAmount = deliveryAmount - returnAmount;

    await conn.execute(
      `INSERT INTO sal_reconciliation (reconciliation_no, customer_id, customer_name, period_start, period_end, delivery_amount, return_amount, discount_amount, net_amount, received_amount, balance_amount, status, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 0, ?, 1, ?)`,
      [reconciliationNo, customer_id, customer_name || null, period_start, period_end, deliveryAmount, returnAmount, netAmount, netAmount, remark || null]
    );

    const [rows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
    const rcId = rows[0].id;

    const deliveryList = await query(
      `SELECT id, delivery_no, delivery_date, total_amount FROM sal_delivery_order WHERE customer_id = ? AND delivery_date BETWEEN ? AND ? AND deleted = 0 AND status >= 2`,
      [customer_id, period_start, period_end]
    ) as any[];

    for (const d of deliveryList) {
      await conn.execute(
        `INSERT INTO sal_reconciliation_detail (reconciliation_id, source_type, source_id, source_no, source_date, amount) VALUES (?, 1, ?, ?, ?, ?)`,
        [rcId, d.id, d.delivery_no, d.delivery_date, d.total_amount]
      );
    }

    const returnList = await query(
      `SELECT id, return_no, return_date, total_amount FROM sal_return_order WHERE customer_id = ? AND return_date BETWEEN ? AND ? AND deleted = 0 AND status >= 2`,
      [customer_id, period_start, period_end]
    ) as any[];

    for (const r of returnList) {
      await conn.execute(
        `INSERT INTO sal_reconciliation_detail (reconciliation_id, source_type, source_id, source_no, source_date, amount) VALUES (?, 2, ?, ?, ?, ?)`,
        [rcId, r.id, r.return_no, r.return_date, r.total_amount]
      );
    }

    return { id: rcId, reconciliation_no: reconciliationNo, delivery_amount: deliveryAmount, return_amount: returnAmount, net_amount: netAmount };
  });

  return successResponse(result, '对账单创建成功');
}, '创建对账单失败');

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  if (!body.id) return commonErrors.badRequest('对账单ID不能为空');

  const existing = await queryOne('SELECT id, status FROM sal_reconciliation WHERE id = ? AND deleted = 0', [body.id]);
  if (!existing) return commonErrors.notFound('对账单不存在');

  const fields: string[] = [];
  const values: any[] = [];
  const allowedFields = ['status', 'confirm_status', 'confirm_person', 'confirm_remark', 'discount_amount', 'received_amount', 'remark'];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  if (body.confirm_status === 1) {
    fields.push('confirm_time = NOW()');
  }

  if (body.received_amount !== undefined) {
    const rc = await queryOne('SELECT net_amount, discount_amount FROM sal_reconciliation WHERE id = ?', [body.id]) as any;
    if (rc) {
      const netAmount = parseFloat(rc.net_amount) || 0;
      const discountAmount = body.discount_amount !== undefined ? parseFloat(body.discount_amount) : parseFloat(rc.discount_amount) || 0;
      const receivedAmount = parseFloat(body.received_amount) || 0;
      const balanceAmount = netAmount - discountAmount - receivedAmount;
      fields.push('balance_amount = ?');
      values.push(balanceAmount);
    }
  }

  if (fields.length > 0) {
    values.push(body.id);
    await execute(`UPDATE sal_reconciliation SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  return successResponse(null, '对账单更新成功');
}, '更新对账单失败');

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return commonErrors.badRequest('对账单ID不能为空');

  const existing = await queryOne('SELECT id, status FROM sal_reconciliation WHERE id = ? AND deleted = 0', [parseInt(id)]);
  if (!existing) return commonErrors.notFound('对账单不存在');

  if ((existing as any).status >= 3) {
    return errorResponse('已确认的对账单不能删除', 400, 400);
  }

  await execute('UPDATE sal_reconciliation SET deleted = 1 WHERE id = ?', [parseInt(id)]);
  await execute('DELETE FROM sal_reconciliation_detail WHERE reconciliation_id = ?', [parseInt(id)]);
  return successResponse(null, '对账单删除成功');
}, '删除对账单失败');
