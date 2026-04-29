import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const adjustNo = searchParams.get('adjustNo') || '';
  const adjustType = searchParams.get('adjustType') || '';

  let where = 'WHERE a.deleted = 0';
  const params: any[] = [];
  if (adjustNo) { where += ' AND a.adjust_no LIKE ?'; params.push('%' + adjustNo + '%'); }
  if (adjustType) { where += ' AND a.adjust_type = ?'; params.push(Number(adjustType)); }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM inv_stock_adjust a ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query(
    'SELECT a.*, w.warehouse_name FROM inv_stock_adjust a LEFT JOIN inv_warehouse w ON a.warehouse_id = w.id ' + where + ' ORDER BY a.create_time DESC LIMIT ? OFFSET ?',
    [...params, pageSize, (page - 1) * pageSize]
  );
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { warehouse_id, adjust_date, adjust_type, operator_name, remark, items } = body;
  const now = new Date();
  const adjustNo = 'TZ' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const result: any = await execute(
    'INSERT INTO inv_stock_adjust (adjust_no, warehouse_id, adjust_date, adjust_type, operator_name, remark) VALUES (?, ?, ?, ?, ?, ?)',
    [adjustNo, warehouse_id, adjust_date, adjust_type || 1, operator_name || null, remark || null]
  );

  if (items && Array.isArray(items)) {
    for (const item of items) {
      await execute(
        'INSERT INTO inv_stock_adjust_item (adjust_id, material_id, material_code, material_name, before_qty, adjust_qty, after_qty, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [result.insertId, item.material_id, item.material_code || null, item.material_name || null, item.before_qty || 0, item.adjust_qty || 0, item.after_qty || 0, item.unit || null, item.batch_no || null]
      );
    }
  }
  return successResponse({ id: result.insertId, adjust_no: adjustNo }, '调整单创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, status, remark } = body;
  if (status !== undefined) await execute('UPDATE inv_stock_adjust SET status = ? WHERE id = ? AND deleted = 0', [status, id]);
  if (remark !== undefined) await execute('UPDATE inv_stock_adjust SET remark = ? WHERE id = ? AND deleted = 0', [remark, id]);
  return successResponse(null, '更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });
  await execute('UPDATE inv_stock_adjust SET deleted = 1 WHERE id = ?', [Number(id)]);
  return successResponse(null, '删除成功');
});
