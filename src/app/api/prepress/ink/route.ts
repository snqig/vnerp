import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const inkCode = searchParams.get('inkCode') || '';
  const inkName = searchParams.get('inkName') || '';
  const inkType = searchParams.get('inkType') || '';

  let where = 'WHERE deleted = 0';
  const params: any[] = [];
  if (inkCode) { where += ' AND ink_code LIKE ?'; params.push('%' + inkCode + '%'); }
  if (inkName) { where += ' AND ink_name LIKE ?'; params.push('%' + inkName + '%'); }
  if (inkType) { where += ' AND ink_type = ?'; params.push(Number(inkType)); }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM prd_ink ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query('SELECT * FROM prd_ink ' + where + ' ORDER BY create_time DESC LIMIT ? OFFSET ?', [...params, pageSize, (page - 1) * pageSize]);
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { ink_code, ink_name, ink_type, color_name, color_code, brand, supplier_id, unit, specification, safety_stock, shelf_life, remark } = body;
  const result: any = await execute(
    'INSERT INTO prd_ink (ink_code, ink_name, ink_type, color_name, color_code, brand, supplier_id, unit, specification, safety_stock, shelf_life, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [ink_code, ink_name, ink_type || null, color_name || null, color_code || null, brand || null, supplier_id || null, unit || 'kg', specification || null, safety_stock || 0, shelf_life || null, remark || null]
  );
  return successResponse({ id: result.insertId }, '油墨创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, ink_name, ink_type, color_name, color_code, brand, supplier_id, unit, specification, safety_stock, shelf_life, status, stock_qty, remark } = body;
  const fields: string[] = [];
  const values: any[] = [];
  if (ink_name !== undefined) { fields.push('ink_name = ?'); values.push(ink_name); }
  if (ink_type !== undefined) { fields.push('ink_type = ?'); values.push(ink_type); }
  if (color_name !== undefined) { fields.push('color_name = ?'); values.push(color_name); }
  if (color_code !== undefined) { fields.push('color_code = ?'); values.push(color_code); }
  if (brand !== undefined) { fields.push('brand = ?'); values.push(brand); }
  if (supplier_id !== undefined) { fields.push('supplier_id = ?'); values.push(supplier_id); }
  if (unit !== undefined) { fields.push('unit = ?'); values.push(unit); }
  if (specification !== undefined) { fields.push('specification = ?'); values.push(specification); }
  if (safety_stock !== undefined) { fields.push('safety_stock = ?'); values.push(safety_stock); }
  if (shelf_life !== undefined) { fields.push('shelf_life = ?'); values.push(shelf_life); }
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }
  if (stock_qty !== undefined) { fields.push('stock_qty = ?'); values.push(stock_qty); }
  if (remark !== undefined) { fields.push('remark = ?'); values.push(remark); }
  if (fields.length > 0) {
    values.push(id);
    await execute('UPDATE prd_ink SET ' + fields.join(', ') + ' WHERE id = ? AND deleted = 0', values);
  }
  return successResponse(null, '更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });
  await execute('UPDATE prd_ink SET deleted = 1 WHERE id = ?', [Number(id)]);
  return successResponse(null, '删除成功');
});
