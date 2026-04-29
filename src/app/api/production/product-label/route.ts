import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const labelNo = searchParams.get('labelNo') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE deleted = 0';
  const params: any[] = [];
  if (labelNo) { where += ' AND label_no LIKE ?'; params.push('%' + labelNo + '%'); }
  if (status) { where += ' AND status = ?'; params.push(Number(status)); }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM prd_product_label ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query('SELECT * FROM prd_product_label ' + where + ' ORDER BY create_time DESC LIMIT ? OFFSET ?', [...params, pageSize, (page - 1) * pageSize]);
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { work_order_id, work_order_no, material_id, material_code, material_name, quantity, unit, batch_no, qc_result, remark } = body;
  const now = new Date();
  const labelNo = 'LB' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const result: any = await execute(
    'INSERT INTO prd_product_label (label_no, work_order_id, work_order_no, material_id, material_code, material_name, quantity, unit, batch_no, qc_result, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [labelNo, work_order_id || null, work_order_no || null, material_id || null, material_code || null, material_name || null, quantity, unit || null, batch_no || null, qc_result || null, remark || null]
  );
  return successResponse({ id: result.insertId, label_no: labelNo }, '成品标签创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, status, print_count, remark } = body;
  if (status !== undefined) await execute('UPDATE prd_product_label SET status = ? WHERE id = ? AND deleted = 0', [status, id]);
  if (print_count !== undefined) await execute('UPDATE prd_product_label SET print_count = ?, print_time = NOW() WHERE id = ? AND deleted = 0', [print_count, id]);
  if (remark !== undefined) await execute('UPDATE prd_product_label SET remark = ? WHERE id = ? AND deleted = 0', [remark, id]);
  return successResponse(null, '更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });
  await execute('UPDATE prd_product_label SET deleted = 1 WHERE id = ?', [Number(id)]);
  return successResponse(null, '删除成功');
});
