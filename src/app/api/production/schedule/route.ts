import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const workshop = searchParams.get('workshop') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE deleted = 0';
  const params: any[] = [];
  if (workshop) { where += ' AND workshop = ?'; params.push(workshop); }
  if (status !== '') { where += ' AND status = ?'; params.push(Number(status)); }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM prd_schedule ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query('SELECT * FROM prd_schedule ' + where + ' ORDER BY planned_start ASC, priority ASC LIMIT ? OFFSET ?', [...params, pageSize, (page - 1) * pageSize]);
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { order_id, order_no, product_id, product_code, product_name, workshop, planned_qty, planned_start, planned_end, priority, scheduler, remark } = body;

  if (!product_name) return errorResponse('产品名称不能为空', 400, 400);

  const now = new Date();
  const scheduleNo = 'PS' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const result: any = await execute(
    `INSERT INTO prd_schedule (schedule_no, order_id, order_no, product_id, product_code, product_name, workshop, planned_qty, planned_start, planned_end, priority, scheduler, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [scheduleNo, order_id || null, order_no || null, product_id || null, product_code || null, product_name, workshop || 'die_cut', planned_qty || 0, planned_start || null, planned_end || null, priority || 2, scheduler || null, remark || null]
  );

  return successResponse({ id: result.insertId, schedule_no: scheduleNo }, '排产计划创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, ...fields } = body;
  if (!id) return errorResponse('ID不能为空', 400, 400);

  const updateFields: string[] = [];
  const updateValues: any[] = [];
  const allowedFields = ['workshop', 'planned_qty', 'completed_qty', 'planned_start', 'planned_end', 'actual_start', 'actual_end', 'priority', 'status', 'scheduler', 'remark'];
  for (const field of allowedFields) {
    if (fields[field] !== undefined) { updateFields.push(`${field} = ?`); updateValues.push(fields[field]); }
  }
  if (updateFields.length > 0) {
    await execute(`UPDATE prd_schedule SET ${updateFields.join(', ')} WHERE id = ? AND deleted = 0`, [...updateValues, id]);
  }
  return successResponse(null, '更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return errorResponse('ID不能为空', 400, 400);
  await execute('UPDATE prd_schedule SET deleted = 1 WHERE id = ?', [id]);
  return successResponse(null, '删除成功');
});
