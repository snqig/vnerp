import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const returnNo = searchParams.get('returnNo') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE r.deleted = 0';
  const params: any[] = [];
  if (returnNo) { where += ' AND r.return_no LIKE ?'; params.push('%' + returnNo + '%'); }
  if (status) { where += ' AND r.status = ?'; params.push(Number(status)); }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM prd_material_return r ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query(
    'SELECT r.*, w.warehouse_name FROM prd_material_return r LEFT JOIN inv_warehouse w ON r.warehouse_id = w.id ' + where + ' ORDER BY r.create_time DESC LIMIT ? OFFSET ?',
    [...params, pageSize, (page - 1) * pageSize]
  );
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { work_order_id, work_order_no, warehouse_id, return_date, operator_name, remark, items } = body;
  const now = new Date();
  const returnNo = 'MR' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const result: any = await execute(
    'INSERT INTO prd_material_return (return_no, work_order_id, work_order_no, warehouse_id, return_date, operator_name, remark) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [returnNo, work_order_id || null, work_order_no || null, warehouse_id, return_date, operator_name || null, remark || null]
  );

  if (items && Array.isArray(items)) {
    for (const item of items) {
      await execute(
        'INSERT INTO prd_material_return_item (return_id, material_id, material_code, material_name, return_qty, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [result.insertId, item.material_id, item.material_code || null, item.material_name || null, item.return_qty, item.unit || null, item.batch_no || null]
      );
    }
  }
  return successResponse({ id: result.insertId, return_no: returnNo }, '退料单创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, status, remark } = body;
  if (status !== undefined) await execute('UPDATE prd_material_return SET status = ? WHERE id = ? AND deleted = 0', [status, id]);
  if (remark !== undefined) await execute('UPDATE prd_material_return SET remark = ? WHERE id = ? AND deleted = 0', [remark, id]);
  return successResponse(null, '更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });
  await execute('UPDATE prd_material_return SET deleted = 1 WHERE id = ?', [Number(id)]);
  return successResponse(null, '删除成功');
});
