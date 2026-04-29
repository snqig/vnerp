import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const repairNo = searchParams.get('repairNo') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE deleted = 0';
  const params: any[] = [];
  if (repairNo) { where += ' AND repair_no LIKE ?'; params.push('%' + repairNo + '%'); }
  if (status) { where += ' AND status = ?'; params.push(Number(status)); }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM eqp_repair ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query('SELECT * FROM eqp_repair ' + where + ' ORDER BY create_time DESC LIMIT ? OFFSET ?', [...params, pageSize, (page - 1) * pageSize]);
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { equipment_id, equipment_code, equipment_name, fault_date, fault_desc, repair_type, repair_person, remark } = body;
  const now = new Date();
  const repairNo = 'WX' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const result: any = await execute(
    'INSERT INTO eqp_repair (repair_no, equipment_id, equipment_code, equipment_name, fault_date, fault_desc, repair_type, repair_person, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [repairNo, equipment_id, equipment_code || null, equipment_name || null, fault_date, fault_desc || null, repair_type || 1, repair_person || null, remark || null]
  );
  return successResponse({ id: result.insertId, repair_no: repairNo }, '维修单创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, status, repair_start_time, repair_end_time, repair_cost, repair_result, remark } = body;
  if (status !== undefined) await execute('UPDATE eqp_repair SET status = ? WHERE id = ? AND deleted = 0', [status, id]);
  if (repair_start_time !== undefined) await execute('UPDATE eqp_repair SET repair_start_time = ? WHERE id = ? AND deleted = 0', [repair_start_time, id]);
  if (repair_end_time !== undefined) await execute('UPDATE eqp_repair SET repair_end_time = ? WHERE id = ? AND deleted = 0', [repair_end_time, id]);
  if (repair_cost !== undefined) await execute('UPDATE eqp_repair SET repair_cost = ? WHERE id = ? AND deleted = 0', [repair_cost, id]);
  if (repair_result !== undefined) await execute('UPDATE eqp_repair SET repair_result = ? WHERE id = ? AND deleted = 0', [repair_result, id]);
  if (remark !== undefined) await execute('UPDATE eqp_repair SET remark = ? WHERE id = ? AND deleted = 0', [remark, id]);
  return successResponse(null, '更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });
  await execute('UPDATE eqp_repair SET deleted = 1 WHERE id = ?', [Number(id)]);
  return successResponse(null, '删除成功');
});
