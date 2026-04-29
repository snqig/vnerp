import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction } from '@/lib/db';
import { successResponse, errorResponse, commonErrors, withErrorHandler, validateRequestBody } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status');
  const supplier_id = searchParams.get('supplier_id');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  if (id) {
    const record = await queryOne('SELECT p.*, s.supplier_name FROM fin_payable p LEFT JOIN pur_supplier s ON p.supplier_id = s.id WHERE p.id = ? AND p.deleted = 0', [parseInt(id)]);
    if (!record) return commonErrors.notFound('应付记录不存在');
    const payments = await query('SELECT * FROM fin_payment_record WHERE payable_id = ? AND deleted = 0 ORDER BY payment_date DESC', [parseInt(id)]);
    return successResponse({ ...record, payments });
  }

  let sql = `SELECT p.*, s.supplier_name
    FROM fin_payable p
    LEFT JOIN pur_supplier s ON p.supplier_id = s.id
    WHERE p.deleted = 0`;
  const values: any[] = [];

  if (keyword) {
    sql += ' AND (p.payable_no LIKE ? OR p.source_no LIKE ? OR s.supplier_name LIKE ?)';
    const like = `%${keyword}%`;
    values.push(like, like, like);
  }
  if (status) {
    sql += ' AND p.status = ?';
    values.push(parseInt(status));
  }
  if (supplier_id) {
    sql += ' AND p.supplier_id = ?';
    values.push(parseInt(supplier_id));
  }

  sql += ' ORDER BY p.create_time DESC LIMIT ? OFFSET ?';
  values.push(pageSize, (page - 1) * pageSize);

  const list = await query(sql, values);

  const countSql = `SELECT COUNT(*) as total FROM fin_payable p LEFT JOIN pur_supplier s ON p.supplier_id = s.id WHERE p.deleted = 0`;
  const countResult = await queryOne(countSql) as any;

  const summarySql = `SELECT
    COALESCE(SUM(amount), 0) as total_amount,
    COALESCE(SUM(paid_amount), 0) as total_paid,
    COALESCE(SUM(balance), 0) as total_balance
    FROM fin_payable WHERE deleted = 0`;
  const summary = await queryOne(summarySql) as any;

  return successResponse({
    list,
    total: countResult?.total || 0,
    page,
    pageSize,
    summary: {
      total_amount: parseFloat(summary?.total_amount || 0),
      total_paid: parseFloat(summary?.total_paid || 0),
      total_balance: parseFloat(summary?.total_balance || 0),
    }
  });
}, '获取应付列表失败');

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const validation = validateRequestBody(body, ['supplier_id', 'amount']);
  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  const { source_type, source_no, supplier_id, amount, due_date, remark } = body;
  const payableNo = `AP${Date.now()}`;

  await execute(
    `INSERT INTO fin_payable (payable_no, source_type, source_no, supplier_id, amount, paid_amount, balance, due_date, status, remark)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, 1, ?)`,
    [payableNo, source_type || 1, source_no || null, supplier_id, amount, amount, due_date || null, remark || null]
  );

  const [rows]: any = await execute('SELECT LAST_INSERT_ID() as id');
  return successResponse({ id: rows[0].id, payable_no: payableNo }, '应付单创建成功');
}, '创建应付单失败');

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  if (!body.id) return commonErrors.badRequest('应付单ID不能为空');

  const existing = await queryOne('SELECT id, status FROM fin_payable WHERE id = ? AND deleted = 0', [body.id]);
  if (!existing) return commonErrors.notFound('应付单不存在');

  const fields: string[] = [];
  const values: any[] = [];
  const allowedFields = ['due_date', 'remark'];
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(body[field]);
    }
  }
  if (fields.length > 0) {
    values.push(body.id);
    await execute(`UPDATE fin_payable SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  return successResponse(null, '应付单更新成功');
}, '更新应付单失败');

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return commonErrors.badRequest('应付单ID不能为空');

  const existing = await queryOne('SELECT id, status FROM fin_payable WHERE id = ? AND deleted = 0', [parseInt(id)]);
  if (!existing) return commonErrors.notFound('应付单不存在');

  if ((existing as any).status === 3) {
    return errorResponse('已完成的应付单不能删除', 400, 400);
  }

  await execute('UPDATE fin_payable SET deleted = 1 WHERE id = ?', [parseInt(id)]);
  return successResponse(null, '应付单删除成功');
}, '删除应付单失败');
