import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 50);
  const categoryName = searchParams.get('categoryName') || '';
  const categoryType = searchParams.get('categoryType') || '';

  let where = 'WHERE deleted = 0';
  const params: any[] = [];
  if (categoryName) { where += ' AND category_name LIKE ?'; params.push('%' + categoryName + '%'); }
  if (categoryType) { where += ' AND category_type = ?'; params.push(Number(categoryType)); }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM inv_material_category ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query('SELECT * FROM inv_material_category ' + where + ' ORDER BY sort_order ASC, id ASC LIMIT ? OFFSET ?', [...params, pageSize, (page - 1) * pageSize]);
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { category_code, category_name, parent_id, category_type, sort_order, remark } = body;
  const result: any = await execute(
    'INSERT INTO inv_material_category (category_code, category_name, parent_id, category_type, sort_order, remark) VALUES (?, ?, ?, ?, ?, ?)',
    [category_code, category_name, parent_id || 0, category_type || null, sort_order || 0, remark || null]
  );
  return successResponse({ id: result.insertId }, '分类创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, category_name, category_type, sort_order, status, remark } = body;
  if (category_name !== undefined) await execute('UPDATE inv_material_category SET category_name = ? WHERE id = ? AND deleted = 0', [category_name, id]);
  if (category_type !== undefined) await execute('UPDATE inv_material_category SET category_type = ? WHERE id = ? AND deleted = 0', [category_type, id]);
  if (sort_order !== undefined) await execute('UPDATE inv_material_category SET sort_order = ? WHERE id = ? AND deleted = 0', [sort_order, id]);
  if (status !== undefined) await execute('UPDATE inv_material_category SET status = ? WHERE id = ? AND deleted = 0', [status, id]);
  if (remark !== undefined) await execute('UPDATE inv_material_category SET remark = ? WHERE id = ? AND deleted = 0', [remark, id]);
  return successResponse(null, '更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });
  await execute('UPDATE inv_material_category SET deleted = 1 WHERE id = ?', [Number(id)]);
  return successResponse(null, '删除成功');
});
