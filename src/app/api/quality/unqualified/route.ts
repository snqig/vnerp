import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const handleNo = searchParams.get('handleNo') || '';
  const handleType = searchParams.get('handleType') || '';
  const handleStatus = searchParams.get('handleStatus') || '';

  let where = 'WHERE deleted = 0';
  const params: any[] = [];
  if (handleNo) { where += ' AND handle_no LIKE ?'; params.push('%' + handleNo + '%'); }
  if (handleType) { where += ' AND handle_type = ?'; params.push(Number(handleType)); }
  if (handleStatus) { where += ' AND handle_status = ?'; params.push(Number(handleStatus)); }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM qc_unqualified_handle ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query('SELECT * FROM qc_unqualified_handle ' + where + ' ORDER BY create_time DESC LIMIT ? OFFSET ?', [...params, pageSize, (page - 1) * pageSize]);
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { inspection_id, material_id, material_code, material_name, unqualified_qty, handle_type, responsible_dept, responsible_person, remark } = body;
  const now = new Date();
  const handleNo = 'QH' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const result: any = await execute(
    'INSERT INTO qc_unqualified_handle (handle_no, inspection_id, material_id, material_code, material_name, unqualified_qty, handle_type, responsible_dept, responsible_person, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [handleNo, inspection_id || null, material_id || null, material_code || null, material_name || null, unqualified_qty || 0, handle_type, responsible_dept || null, responsible_person || null, remark || null]
  );
  return successResponse({ id: result.insertId, handle_no: handleNo }, '不合格品处理单创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, handle_status, handle_result, cost_amount, remark } = body;
  if (handle_status !== undefined) await execute('UPDATE qc_unqualified_handle SET handle_status = ? WHERE id = ? AND deleted = 0', [handle_status, id]);
  if (handle_result !== undefined) await execute('UPDATE qc_unqualified_handle SET handle_result = ? WHERE id = ? AND deleted = 0', [handle_result, id]);
  if (cost_amount !== undefined) await execute('UPDATE qc_unqualified_handle SET cost_amount = ? WHERE id = ? AND deleted = 0', [cost_amount, id]);
  if (remark !== undefined) await execute('UPDATE qc_unqualified_handle SET remark = ? WHERE id = ? AND deleted = 0', [remark, id]);
  return successResponse(null, '更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });
  await execute('UPDATE qc_unqualified_handle SET deleted = 1 WHERE id = ?', [Number(id)]);
  return successResponse(null, '删除成功');
});
