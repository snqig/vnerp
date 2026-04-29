import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const productName = searchParams.get('productName') || '';
  const lifecycleStage = searchParams.get('lifecycleStage') || '';

  let where = 'WHERE deleted = 0';
  const params: any[] = [];
  if (productName) { where += ' AND product_name LIKE ?'; params.push('%' + productName + '%'); }
  if (lifecycleStage) { where += ' AND lifecycle_stage = ?'; params.push(lifecycleStage); }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM plm_product_lifecycle ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query('SELECT * FROM plm_product_lifecycle ' + where + ' ORDER BY create_time DESC LIMIT ? OFFSET ?', [...params, pageSize, (page - 1) * pageSize]);
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { product_id, product_code, product_name, lifecycle_stage, stage_status, version, change_type, change_reason, change_desc, effective_date, remark } = body;

  if (!product_id || !lifecycle_stage) {
    return errorResponse('产品ID和生命周期阶段不能为空', 400, 400);
  }

  const result: any = await execute(
    `INSERT INTO plm_product_lifecycle (product_id, product_code, product_name, lifecycle_stage, stage_status, version, change_type, change_reason, change_desc, effective_date, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [product_id, product_code || null, product_name || '', lifecycle_stage, stage_status || 1, version || 'V1.0', change_type || null, change_reason || null, change_desc || null, effective_date || null, remark || null]
  );

  return successResponse({ id: result.insertId }, '产品生命周期记录创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, ...fields } = body;
  if (!id) return errorResponse('ID不能为空', 400, 400);

  const updateFields: string[] = [];
  const updateValues: any[] = [];
  const allowedFields = ['lifecycle_stage', 'stage_status', 'version', 'change_type', 'change_reason', 'change_desc', 'approver', 'approve_time', 'effective_date', 'remark'];
  for (const field of allowedFields) {
    if (fields[field] !== undefined) { updateFields.push(`${field} = ?`); updateValues.push(fields[field]); }
  }
  if (updateFields.length > 0) {
    await execute(`UPDATE plm_product_lifecycle SET ${updateFields.join(', ')} WHERE id = ? AND deleted = 0`, [...updateValues, id]);
  }
  return successResponse(null, '更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return errorResponse('ID不能为空', 400, 400);
  await execute('UPDATE plm_product_lifecycle SET deleted = 1 WHERE id = ?', [id]);
  return successResponse(null, '删除成功');
});
