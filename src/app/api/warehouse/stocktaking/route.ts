import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const takingNo = searchParams.get('takingNo') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE s.deleted = 0';
  const params: any[] = [];
  if (takingNo) { where += ' AND s.taking_no LIKE ?'; params.push('%' + takingNo + '%'); }
  if (status) { where += ' AND s.status = ?'; params.push(Number(status)); }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM inv_stocktaking s ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query(
    'SELECT s.*, w.warehouse_name FROM inv_stocktaking s LEFT JOIN inv_warehouse w ON s.warehouse_id = w.id ' + where + ' ORDER BY s.create_time DESC LIMIT ? OFFSET ?',
    [...params, pageSize, (page - 1) * pageSize]
  );
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { warehouse_id, taking_date, taking_type, operator_name, remark, items } = body;
  const now = new Date();
  const takingNo = 'PD' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const result: any = await execute(
    'INSERT INTO inv_stocktaking (taking_no, warehouse_id, taking_date, taking_type, operator_name, remark) VALUES (?, ?, ?, ?, ?, ?)',
    [takingNo, warehouse_id, taking_date, taking_type || 1, operator_name || null, remark || null]
  );

  if (items && Array.isArray(items)) {
    for (const item of items) {
      await execute(
        'INSERT INTO inv_stocktaking_item (taking_id, material_id, material_code, material_name, system_qty, actual_qty, diff_qty, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [result.insertId, item.material_id, item.material_code || null, item.material_name || null, item.system_qty || 0, item.actual_qty || 0, item.diff_qty || 0, item.unit || null, item.batch_no || null]
      );
    }
  }
  return successResponse({ id: result.insertId, taking_no: takingNo }, '盘点单创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, status, remark } = body;
  if (status !== undefined) await execute('UPDATE inv_stocktaking SET status = ? WHERE id = ? AND deleted = 0', [status, id]);
  if (remark !== undefined) await execute('UPDATE inv_stocktaking SET remark = ? WHERE id = ? AND deleted = 0', [remark, id]);
  return successResponse(null, '更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });
  await execute('UPDATE inv_stocktaking SET deleted = 1 WHERE id = ?', [Number(id)]);
  return successResponse(null, '删除成功');
});
