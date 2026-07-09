import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { getJdPrefix, generateDocNo } from '@/lib/global-config';

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const calibrationNo = searchParams.get('calibrationNo') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE deleted = 0';
  const params: any[] = [];
  if (calibrationNo) {
    where += ' AND calibration_no LIKE ?';
    params.push('%' + calibrationNo + '%');
  }
  if (status) {
    where += ' AND status = ?';
    params.push(Number(status));
  }

  const totalRows: any = await query(
    'SELECT COUNT(*) as total FROM eqp_calibration ' + where,
    params
  );
  const total = totalRows[0]?.total || 0;
  const rows: any = await query(
    'SELECT * FROM eqp_calibration ' + where + ' ORDER BY create_time DESC LIMIT ? OFFSET ?',
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
      calibration_date,
      next_calibration_date,
      calibration_org,
      calibration_result,
      certificate_no,
      calibration_cost,
      remark,
    } = body;
    const now = new Date();
    const calibrationNo = generateDocNo(getJdPrefix());

    const result: any = await execute(
      'INSERT INTO eqp_calibration (calibration_no, equipment_id, equipment_code, equipment_name, calibration_date, next_calibration_date, calibration_org, calibration_result, certificate_no, calibration_cost, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        calibrationNo,
        equipment_id,
        equipment_code || null,
        equipment_name || null,
        calibration_date,
        next_calibration_date || null,
        calibration_org || null,
        calibration_result || null,
        certificate_no || null,
        calibration_cost || 0,
        remark || null,
      ]
    );
    return successResponse(
      { id: result.insertId, calibration_no: calibrationNo },
      '检定单创建成功'
    );
  },
  { logTitle: '创建设备检定单', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { id, status, calibration_result, remark } = body;
    if (status !== undefined)
      await execute('UPDATE eqp_calibration SET status = ? WHERE id = ? AND deleted = 0', [
        status,
        id,
      ]);
    if (calibration_result !== undefined)
      await execute(
        'UPDATE eqp_calibration SET calibration_result = ? WHERE id = ? AND deleted = 0',
        [calibration_result, id]
      );
    if (remark !== undefined)
      await execute('UPDATE eqp_calibration SET remark = ? WHERE id = ? AND deleted = 0', [
        remark,
        id,
      ]);
    return successResponse(null, '更新成功');
  },
  { logTitle: '更新设备检定单', logType: 'business' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });
    await execute('UPDATE eqp_calibration SET deleted = 1 WHERE id = ?', [Number(id)]);
    return successResponse(null, '删除成功');
  },
  { logTitle: '删除设备检定单', logType: 'business' }
);
