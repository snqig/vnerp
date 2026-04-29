import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction } from '@/lib/db';
import { successResponse, errorResponse, commonErrors, withErrorHandler, validateRequestBody } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const receivable_id = searchParams.get('receivable_id');
  const customer_id = searchParams.get('customer_id');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  let sql = `SELECT r.*, c.customer_name
    FROM fin_receipt_record r
    LEFT JOIN crm_customer c ON r.customer_id = c.id
    WHERE r.deleted = 0`;
  const values: any[] = [];

  if (receivable_id) {
    sql += ' AND r.receivable_id = ?';
    values.push(parseInt(receivable_id));
  }
  if (customer_id) {
    sql += ' AND r.customer_id = ?';
    values.push(parseInt(customer_id));
  }

  sql += ' ORDER BY r.receipt_date DESC LIMIT ? OFFSET ?';
  values.push(pageSize, (page - 1) * pageSize);

  const list = await query(sql, values);

  const countSql = `SELECT COUNT(*) as total FROM fin_receipt_record WHERE deleted = 0`;
  const countResult = await queryOne(countSql) as any;

  return successResponse({ list, total: countResult?.total || 0, page, pageSize });
}, '获取收款记录失败');

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const validation = validateRequestBody(body, ['receivable_id', 'amount']);
  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  const result = await transaction(async (conn) => {
    const { receivable_id, amount, payment_method, receipt_date, remark } = body;

    const receivable = await conn.execute('SELECT * FROM fin_receivable WHERE id = ? AND deleted = 0 FOR UPDATE', [receivable_id]);
    const recRows = (receivable as any)[0];
    if (!recRows || recRows.length === 0) {
      throw new Error('应收单不存在');
    }
    const rec = recRows[0];

    if (parseFloat(rec.balance) < parseFloat(amount)) {
      throw new Error('收款金额不能超过未收余额');
    }

    const receiptNo = `RC${Date.now()}`;
    const customerId = rec.customer_id;

    await conn.execute(
      `INSERT INTO fin_receipt_record (receipt_no, receivable_id, customer_id, amount, payment_method, receipt_date, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [receiptNo, receivable_id, customerId, amount, payment_method || null, receipt_date || null, remark || null]
    );

    const newReceivedAmount = parseFloat(rec.received_amount) + parseFloat(amount);
    const newBalance = parseFloat(rec.balance) - parseFloat(amount);
    const newStatus = newBalance <= 0 ? 3 : (newReceivedAmount > 0 ? 2 : 1);

    await conn.execute(
      `UPDATE fin_receivable SET received_amount = ?, balance = ?, status = ? WHERE id = ?`,
      [newReceivedAmount, newBalance, newStatus, receivable_id]
    );

    return { receipt_no: receiptNo, new_balance: newBalance, new_status: newStatus };
  });

  return successResponse(result, '收款记录创建成功');
}, '创建收款记录失败');

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return commonErrors.badRequest('收款记录ID不能为空');

  const result = await transaction(async (conn) => {
    const record = await conn.execute('SELECT * FROM fin_receipt_record WHERE id = ? AND deleted = 0', [parseInt(id)]);
    const rows = (record as any)[0];
    if (!rows || rows.length === 0) {
      throw new Error('收款记录不存在');
    }
    const rec = rows[0];

    await conn.execute('UPDATE fin_receipt_record SET deleted = 1 WHERE id = ?', [parseInt(id)]);

    const receivable = await conn.execute('SELECT * FROM fin_receivable WHERE id = ? AND deleted = 0 FOR UPDATE', [rec.receivable_id]);
    const recRows = (receivable as any)[0];
    if (recRows && recRows.length > 0) {
      const rv = recRows[0];
      const newReceivedAmount = parseFloat(rv.received_amount) - parseFloat(rec.amount);
      const newBalance = parseFloat(rv.balance) + parseFloat(rec.amount);
      const newStatus = newReceivedAmount <= 0 ? 1 : (newBalance <= 0 ? 3 : 2);
      await conn.execute(
        `UPDATE fin_receivable SET received_amount = ?, balance = ?, status = ? WHERE id = ?`,
        [Math.max(0, newReceivedAmount), newBalance, newStatus, rec.receivable_id]
      );
    }

    return null;
  });

  return successResponse(null, '收款记录删除成功');
}, '删除收款记录失败');
