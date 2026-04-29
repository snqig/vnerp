import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const sopName = searchParams.get('sopName') || '';
  const sopType = searchParams.get('sopType') || '';

  let where = 'WHERE deleted = 0';
  const params: any[] = [];
  if (sopName) { where += ' AND sop_name LIKE ?'; params.push('%' + sopName + '%'); }
  if (sopType) { where += ' AND sop_type = ?'; params.push(sopType); }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM eng_sop ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query('SELECT * FROM eng_sop ' + where + ' ORDER BY create_time DESC LIMIT ? OFFSET ?', [...params, pageSize, (page - 1) * pageSize]);
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { product_id, product_code, product_name, process_code, process_name, version, sop_type, content, file_url, workshop, equipment_type, effective_date, remark } = body;

  if (!product_name) return errorResponse('产品名称不能为空', 400, 400);

  const now = new Date();
  const sopNo = 'SOP' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const result: any = await execute(
    `INSERT INTO eng_sop (sop_no, sop_name, product_id, product_code, product_name, process_code, process_name, version, sop_type, content, file_url, workshop, equipment_type, effective_date, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [sopNo, (process_name || '') + '-' + (product_name || ''), product_id || null, product_code || null, product_name, process_code || null, process_name || null, version || 'V1.0', sop_type || 'printing', content || null, file_url || null, workshop || null, equipment_type || null, effective_date || null, remark || null]
  );

  return successResponse({ id: result.insertId, sop_no: sopNo }, 'SOP创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, ...fields } = body;
  if (!id) return errorResponse('ID不能为空', 400, 400);

  const updateFields: string[] = [];
  const updateValues: any[] = [];
  const allowedFields = ['sop_name', 'version', 'sop_type', 'content', 'file_url', 'workshop', 'equipment_type', 'status', 'effective_date', 'expire_date', 'approver', 'approve_time', 'remark'];
  for (const field of allowedFields) {
    if (fields[field] !== undefined) { updateFields.push(`${field} = ?`); updateValues.push(fields[field]); }
  }
  if (updateFields.length > 0) {
    await execute(`UPDATE eng_sop SET ${updateFields.join(', ')} WHERE id = ? AND deleted = 0`, [...updateValues, id]);
  }
  return successResponse(null, '更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return errorResponse('ID不能为空', 400, 400);
  await execute('UPDATE eng_sop SET deleted = 1 WHERE id = ?', [id]);
  return successResponse(null, '删除成功');
});
