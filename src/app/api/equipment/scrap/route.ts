import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const scrapNo = searchParams.get('scrapNo') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE deleted = 0';
  const params: any[] = [];
  if (scrapNo) { where += ' AND scrap_no LIKE ?'; params.push('%' + scrapNo + '%'); }
  if (status) { where += ' AND status = ?'; params.push(Number(status)); }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM eqp_scrap ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query('SELECT * FROM eqp_scrap ' + where + ' ORDER BY create_time DESC LIMIT ? OFFSET ?', [...params, pageSize, (page - 1) * pageSize]);
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { equipment_id, equipment_code, equipment_name, scrap_date, scrap_reason, original_value, net_value, approval_person, remark } = body;
  const now = new Date();
  const scrapNo = 'BF' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const result: any = await execute(
    'INSERT INTO eqp_scrap (scrap_no, equipment_id, equipment_code, equipment_name, scrap_date, scrap_reason, original_value, net_value, approval_person, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [scrapNo, equipment_id, equipment_code || null, equipment_name || null, scrap_date, scrap_reason || null, original_value || 0, net_value || 0, approval_person || null, remark || null]
  );
  return successResponse({ id: result.insertId, scrap_no: scrapNo }, '报废单创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, status, remark } = body;
  if (status !== undefined) await execute('UPDATE eqp_scrap SET status = ? WHERE id = ? AND deleted = 0', [status, id]);
  if (remark !== undefined) await execute('UPDATE eqp_scrap SET remark = ? WHERE id = ? AND deleted = 0', [remark, id]);
  return successResponse(null, '更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });
  await execute('UPDATE eqp_scrap SET deleted = 1 WHERE id = ?', [Number(id)]);
  return successResponse(null, '删除成功');
});
