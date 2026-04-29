import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const customerName = searchParams.get('customerName') || '';
  const customerLevel = searchParams.get('customerLevel') || '';
  const analysisPeriod = searchParams.get('analysisPeriod') || '';

  let where = 'WHERE 1=1';
  const params: any[] = [];
  if (customerName) { where += ' AND customer_name LIKE ?'; params.push('%' + customerName + '%'); }
  if (customerLevel) { where += ' AND customer_level = ?'; params.push(customerLevel); }
  if (analysisPeriod) { where += ' AND analysis_period = ?'; params.push(analysisPeriod); }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM crm_customer_analysis ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query('SELECT * FROM crm_customer_analysis ' + where + ' ORDER BY create_time DESC LIMIT ? OFFSET ?', [...params, pageSize, (page - 1) * pageSize]);

  const summaryRows: any = await query(
    `SELECT 
      COUNT(*) as total_customers,
      SUM(order_count) as total_orders,
      SUM(order_amount) as total_amount,
      AVG(satisfaction_score) as avg_satisfaction,
      AVG(on_time_rate) as avg_on_time_rate
    FROM crm_customer_analysis ` + where,
    params
  );
  const summary = summaryRows[0] || {};

  return successResponse({ list: rows, total, page, pageSize, summary });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { customer_id, customer_name, analysis_period, period_start, period_end, order_count, order_amount, delivery_count, return_count, complaint_count, on_time_rate, satisfaction_score, customer_level, growth_rate, remark } = body;

  if (!customer_id) return errorResponse('客户ID不能为空', 400, 400);

  const result: any = await execute(
    `INSERT INTO crm_customer_analysis (customer_id, customer_name, analysis_period, period_start, period_end, order_count, order_amount, delivery_count, return_count, complaint_count, on_time_rate, satisfaction_score, customer_level, growth_rate, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [customer_id, customer_name || '', analysis_period || 'month', period_start || null, period_end || null, order_count || 0, order_amount || 0, delivery_count || 0, return_count || 0, complaint_count || 0, on_time_rate || null, satisfaction_score || null, customer_level || 'C', growth_rate || null, remark || null]
  );

  return successResponse({ id: result.insertId }, '客户分析记录创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, ...fields } = body;
  if (!id) return errorResponse('ID不能为空', 400, 400);

  const updateFields: string[] = [];
  const updateValues: any[] = [];
  const allowedFields = ['order_count', 'order_amount', 'delivery_count', 'return_count', 'complaint_count', 'on_time_rate', 'satisfaction_score', 'customer_level', 'growth_rate', 'remark'];
  for (const field of allowedFields) {
    if (fields[field] !== undefined) { updateFields.push(`${field} = ?`); updateValues.push(fields[field]); }
  }
  if (updateFields.length > 0) {
    await execute(`UPDATE crm_customer_analysis SET ${updateFields.join(', ')} WHERE id = ?`, [...updateValues, id]);
  }
  return successResponse(null, '更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return errorResponse('ID不能为空', 400, 400);
  await execute('DELETE FROM crm_customer_analysis WHERE id = ?', [id]);
  return successResponse(null, '删除成功');
});
