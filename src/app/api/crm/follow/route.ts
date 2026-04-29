import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const customerName = searchParams.get('customerName') || '';
  const followType = searchParams.get('followType') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE deleted = 0';
  const params: any[] = [];
  if (customerName) { where += ' AND customer_name LIKE ?'; params.push('%' + customerName + '%'); }
  if (followType) { where += ' AND follow_type = ?'; params.push(followType); }
  if (status !== '') { where += ' AND status = ?'; params.push(Number(status)); }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM crm_follow_record ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query('SELECT * FROM crm_follow_record ' + where + ' ORDER BY create_time DESC LIMIT ? OFFSET ?', [...params, pageSize, (page - 1) * pageSize]);
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { customer_id, customer_name, follow_type, follow_content, contact_name, salesman_name, next_follow_date, opportunity, status, remark } = body;

  if (!customer_id) return errorResponse('客户ID不能为空', 400, 400);

  const result: any = await execute(
    `INSERT INTO crm_follow_record (customer_id, customer_name, follow_type, follow_content, contact_name, salesman_name, next_follow_date, opportunity, status, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [customer_id, customer_name || '', follow_type || 'phone', follow_content || null, contact_name || null, salesman_name || null, next_follow_date || null, opportunity || null, status || 1, remark || null]
  );

  return successResponse({ id: result.insertId }, '跟进记录创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, ...fields } = body;
  if (!id) return errorResponse('ID不能为空', 400, 400);

  const updateFields: string[] = [];
  const updateValues: any[] = [];
  const allowedFields = ['follow_type', 'follow_content', 'contact_name', 'salesman_name', 'next_follow_date', 'opportunity', 'status', 'remark'];
  for (const field of allowedFields) {
    if (fields[field] !== undefined) { updateFields.push(`${field} = ?`); updateValues.push(fields[field]); }
  }
  if (updateFields.length > 0) {
    await execute(`UPDATE crm_follow_record SET ${updateFields.join(', ')} WHERE id = ? AND deleted = 0`, [...updateValues, id]);
  }
  return successResponse(null, '更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return errorResponse('ID不能为空', 400, 400);
  await execute('UPDATE crm_follow_record SET deleted = 1 WHERE id = ?', [id]);
  return successResponse(null, '删除成功');
});
