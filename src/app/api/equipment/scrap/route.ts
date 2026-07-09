import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { getBfPrefix, generateDocNo } from '@/lib/global-config';

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const scrapNo = searchParams.get('scrapNo') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE deleted = 0';
  const params: Loose[] = [];
  if (scrapNo) {
    where += ' AND scrap_no LIKE ?';
    params.push('%' + scrapNo + '%');
  }
  if (status) {
    where += ' AND status = ?';
    params.push(Number(status));
  }

  const totalRows: Loose = await query('SELECT COUNT(*) as total FROM eqp_scrap ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: Loose = await query(
    'SELECT * FROM eqp_scrap ' + where + ' ORDER BY create_time DESC LIMIT ? OFFSET ?',
    [...params, pageSize, (page - 1) * pageSize]
  );
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const {
      equipment_id,
      equipment_code,
      equipment_name,
      scrap_date,
      scrap_reason,
      original_value,
      net_value,
      approval_person,
      remark,
    } = body;
    const _now = new Date();
    const scrapNo = generateDocNo(getBfPrefix());

    const result: Loose = await execute(
      'INSERT INTO eqp_scrap (scrap_no, equipment_id, equipment_code, equipment_name, scrap_date, scrap_reason, original_value, net_value, approval_person, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        scrapNo,
        equipment_id,
        equipment_code || null,
        equipment_name || null,
        scrap_date,
        scrap_reason || null,
        original_value || 0,
        net_value || 0,
        approval_person || null,
        remark || null,
      ]
    );
    return successResponse({ id: result.insertId, scrap_no: scrapNo }, '报废单创建成功');
  },
  { logTitle: '创建设备报废单', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { id, status, remark } = body;
    if (status !== undefined)
      await execute('UPDATE eqp_scrap SET status = ? WHERE id = ? AND deleted = 0', [status, id]);
    if (remark !== undefined)
      await execute('UPDATE eqp_scrap SET remark = ? WHERE id = ? AND deleted = 0', [remark, id]);
    return successResponse(null, '更新成功');
  },
  { logTitle: '更新设备报废单', logType: 'business' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });
    await execute('UPDATE eqp_scrap SET deleted = 1 WHERE id = ?', [Number(id)]);
    return successResponse(null, '删除成功');
  },
  { logTitle: '删除设备报废单', logType: 'business' }
);
