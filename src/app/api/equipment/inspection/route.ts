import { getTranslations } from 'next-intl/server';

import { NextRequest, NextResponse } from 'next/server';
import { query, execute, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { getInspectionPrefix, generateDocNo } from '@/lib/global-config';

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const equipmentId = searchParams.get('equipment_id') || '';
  const inspectionType = searchParams.get('inspection_type') || '';
  const result = searchParams.get('result') || '';
  const status = searchParams.get('status') || '';
  const startDate = searchParams.get('start_date') || '';
  const endDate = searchParams.get('end_date') || '';

  let where = 'WHERE deleted = 0';
  const params: SqlValue[] = [];

  if (equipmentId) {
    where += ' AND equipment_id = ?';
    params.push(Number(equipmentId));
  }
  if (inspectionType) {
    where += ' AND inspection_type = ?';
    params.push(Number(inspectionType));
  }
  if (result) {
    where += ' AND result = ?';
    params.push(Number(result));
  }
  if (status) {
    where += ' AND status = ?';
    params.push(Number(status));
  }
  if (startDate) {
    where += ' AND inspection_date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    where += ' AND inspection_date <= ?';
    params.push(endDate);
  }

  const totalRows = await query('SELECT COUNT(*) as total FROM eqp_inspection ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows = await query(
    'SELECT i.*, e.equipment_code, e.equipment_name FROM eqp_inspection i LEFT JOIN eqp_equipment e ON i.equipment_id = e.id ' + where + ' ORDER BY i.create_time DESC LIMIT ? OFFSET ?',
    [...params, pageSize, (page - 1) * pageSize]
  );
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const ts = await getTranslations('Equipment');
    const body = await request.json();
    const {
      equipment_id,
      inspection_type,
      inspection_date,
      inspector,
      temperature,
      vibration,
      pressure,
      noise_level,
      oil_level,
      belt_tension,
      result,
      abnormal_desc,
      handling_advice,
    } = body;

    const _now = new Date();
    const inspectionNo = generateDocNo(getInspectionPrefix());

    const result2 = await execute(
      'INSERT INTO eqp_inspection (inspection_no, equipment_id, inspection_type, inspection_date, inspector, temperature, vibration, pressure, noise_level, oil_level, belt_tension, result, abnormal_desc, handling_advice) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        inspectionNo,
        equipment_id,
        inspection_type || 1,
        inspection_date,
        inspector || null,
        temperature != null ? Number(temperature) : null,
        vibration || null,
        pressure != null ? Number(pressure) : null,
        noise_level || null,
        oil_level || null,
        belt_tension || null,
        result != null ? Number(result) : 1,
        abnormal_desc || null,
        handling_advice || null,
      ]
    );
    return successResponse({ id: result2.insertId, inspection_no: inspectionNo }, ts('k_inspect_created'));
  },
  { logTitle: '创建设备点检单', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
    const ts = await getTranslations('Equipment');
    const body = await request.json();
    const { id, inspection_type, inspector, temperature, vibration, pressure, noise_level, oil_level, belt_tension, result, abnormal_desc, handling_advice, status } = body;

    const updateFields: string[] = [];
    const updateValues: SqlValue[] = [];

    if (inspection_type !== undefined) {
      updateFields.push('inspection_type = ?');
      updateValues.push(Number(inspection_type));
    }
    if (inspector !== undefined) {
      updateFields.push('inspector = ?');
      updateValues.push(inspector || null);
    }
    if (temperature !== undefined) {
      updateFields.push('temperature = ?');
      updateValues.push(temperature != null ? Number(temperature) : null);
    }
    if (vibration !== undefined) {
      updateFields.push('vibration = ?');
      updateValues.push(vibration || null);
    }
    if (pressure !== undefined) {
      updateFields.push('pressure = ?');
      updateValues.push(pressure != null ? Number(pressure) : null);
    }
    if (noise_level !== undefined) {
      updateFields.push('noise_level = ?');
      updateValues.push(noise_level || null);
    }
    if (oil_level !== undefined) {
      updateFields.push('oil_level = ?');
      updateValues.push(oil_level || null);
    }
    if (belt_tension !== undefined) {
      updateFields.push('belt_tension = ?');
      updateValues.push(belt_tension || null);
    }
    if (result !== undefined) {
      updateFields.push('result = ?');
      updateValues.push(Number(result));
    }
    if (abnormal_desc !== undefined) {
      updateFields.push('abnormal_desc = ?');
      updateValues.push(abnormal_desc || null);
    }
    if (handling_advice !== undefined) {
      updateFields.push('handling_advice = ?');
      updateValues.push(handling_advice || null);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(Number(status));
    }

    if (updateFields.length === 0) {
      return errorResponse(ts('k_15vo87k'), 400, 400);
    }

    updateFields.push('update_time = NOW()');
    updateValues.push(Number(id));

    await execute(
      `UPDATE eqp_inspection SET ${updateFields.join(', ')} WHERE id = ? AND deleted = 0`,
      updateValues
    );
    return successResponse(null, ts('k_1795bzg'));
  },
  { logTitle: '更新设备点检单', logType: 'business' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
    const ts = await getTranslations('Equipment');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: ts('k_js4lo9') }, { status: 400 });
    await execute('UPDATE eqp_inspection SET deleted = 1 WHERE id = ?', [Number(id)]);
    return successResponse(null, ts('k_1hlqs'));
  },
  { logTitle: '删除设备点检单', logType: 'business' }
);