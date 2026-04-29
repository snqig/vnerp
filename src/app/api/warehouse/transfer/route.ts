import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const transferNo = searchParams.get('transferNo') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE t.deleted = 0';
  const params: any[] = [];
  if (transferNo) { where += ' AND t.transfer_no LIKE ?'; params.push('%' + transferNo + '%'); }
  if (status) { where += ' AND t.status = ?'; params.push(Number(status)); }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM inv_transfer_order t ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query(
    'SELECT t.*, w1.warehouse_name as from_warehouse_name, w2.warehouse_name as to_warehouse_name FROM inv_transfer_order t LEFT JOIN inv_warehouse w1 ON t.from_warehouse_id = w1.id LEFT JOIN inv_warehouse w2 ON t.to_warehouse_id = w2.id ' + where + ' ORDER BY t.create_time DESC LIMIT ? OFFSET ?',
    [...params, pageSize, (page - 1) * pageSize]
  );
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { from_warehouse_id, to_warehouse_id, transfer_date, transfer_type, operator_name, remark, items } = body;
  const now = new Date();
  const transferNo = 'TF' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const result: any = await execute(
    'INSERT INTO inv_transfer_order (transfer_no, from_warehouse_id, to_warehouse_id, transfer_date, transfer_type, operator_name, remark) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [transferNo, from_warehouse_id, to_warehouse_id, transfer_date, transfer_type || 1, operator_name || null, remark || null]
  );

  if (items && Array.isArray(items)) {
    for (const item of items) {
      await execute(
        'INSERT INTO inv_transfer_item (transfer_id, material_id, material_code, material_name, quantity, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [result.insertId, item.material_id, item.material_code || null, item.material_name || null, item.quantity, item.unit || null, item.batch_no || null]
      );
    }
  }
  return successResponse({ id: result.insertId, transfer_no: transferNo }, '调拨单创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, status, remark } = body;
  if (status !== undefined) await execute('UPDATE inv_transfer_order SET status = ? WHERE id = ? AND deleted = 0', [status, id]);
  if (remark !== undefined) await execute('UPDATE inv_transfer_order SET remark = ? WHERE id = ? AND deleted = 0', [remark, id]);
  return successResponse(null, '更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });
  await execute('UPDATE inv_transfer_order SET deleted = 1 WHERE id = ?', [Number(id)]);
  return successResponse(null, '删除成功');
});
