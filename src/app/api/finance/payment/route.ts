import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction } from '@/lib/db';
import { successResponse, errorResponse, commonErrors, withErrorHandler, validateRequestBody } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const payable_id = searchParams.get('payable_id');
  const supplier_id = searchParams.get('supplier_id');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  let sql = `SELECT p.*, s.supplier_name
    FROM fin_payment_record p
    LEFT JOIN pur_supplier s ON p.supplier_id = s.id
    WHERE p.deleted = 0`;
  const values: any[] = [];

  if (payable_id) {
    sql += ' AND p.payable_id = ?';
    values.push(parseInt(payable_id));
  }
  if (supplier_id) {
    sql += ' AND p.supplier_id = ?';
    values.push(parseInt(supplier_id));
  }

  sql += ' ORDER BY p.payment_date DESC LIMIT ? OFFSET ?';
  values.push(pageSize, (page - 1) * pageSize);

  const list = await query(sql, values);

  const countSql = `SELECT COUNT(*) as total FROM fin_payment_record WHERE deleted = 0`;
  const countResult = await queryOne(countSql) as any;

  return successResponse({ list, total: countResult?.total || 0, page, pageSize });
}, '获取付款记录失败');

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const validation = validateRequestBody(body, ['payable_id', 'amount']);
  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  const result = await transaction(async (conn) => {
    const { payable_id, amount, payment_method, payment_date, remark } = body;

    const payable = await conn.execute('SELECT * FROM fin_payable WHERE id = ? AND deleted = 0 FOR UPDATE', [payable_id]);
    const payRows = (payable as any)[0];
    if (!payRows || payRows.length === 0) {
      throw new Error('应付单不存在');
    }
    const pay = payRows[0];

    if (parseFloat(pay.balance) < parseFloat(amount)) {
      throw new Error('付款金额不能超过未付余额');
    }

    const paymentNo = `PY${Date.now()}`;
    const supplierId = pay.supplier_id;

    await conn.execute(
      `INSERT INTO fin_payment_record (payment_no, payable_id, supplier_id, amount, payment_method, payment_date, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [paymentNo, payable_id, supplierId, amount, payment_method || null, payment_date || null, remark || null]
    );

    const newPaidAmount = parseFloat(pay.paid_amount) + parseFloat(amount);
    const newBalance = parseFloat(pay.balance) - parseFloat(amount);
    const newStatus = newBalance <= 0 ? 3 : (newPaidAmount > 0 ? 2 : 1);

    await conn.execute(
      `UPDATE fin_payable SET paid_amount = ?, balance = ?, status = ? WHERE id = ?`,
      [newPaidAmount, newBalance, newStatus, payable_id]
    );

    return { payment_no: paymentNo, new_balance: newBalance, new_status: newStatus };
  });

  return successResponse(result, '付款记录创建成功');
}, '创建付款记录失败');

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return commonErrors.badRequest('付款记录ID不能为空');

  const result = await transaction(async (conn) => {
    const record = await conn.execute('SELECT * FROM fin_payment_record WHERE id = ? AND deleted = 0', [parseInt(id)]);
    const rows = (record as any)[0];
    if (!rows || rows.length === 0) {
      throw new Error('付款记录不存在');
    }
    const rec = rows[0];

    await conn.execute('UPDATE fin_payment_record SET deleted = 1 WHERE id = ?', [parseInt(id)]);

    const payable = await conn.execute('SELECT * FROM fin_payable WHERE id = ? AND deleted = 0 FOR UPDATE', [rec.payable_id]);
    const payRows = (payable as any)[0];
    if (payRows && payRows.length > 0) {
      const pay = payRows[0];
      const newPaidAmount = parseFloat(pay.paid_amount) - parseFloat(rec.amount);
      const newBalance = parseFloat(pay.balance) + parseFloat(rec.amount);
      const newStatus = newPaidAmount <= 0 ? 1 : (newBalance <= 0 ? 3 : 2);
      await conn.execute(
        `UPDATE fin_payable SET paid_amount = ?, balance = ?, status = ? WHERE id = ?`,
        [Math.max(0, newPaidAmount), newBalance, newStatus, rec.payable_id]
      );
    }

    return null;
  });

  return successResponse(null, '付款记录删除成功');
}, '删除付款记录失败');
