import { NextRequest, NextResponse } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const type = searchParams.get('type') || 'plan';

  if (type === 'plan') {
    const planNo = searchParams.get('planNo') || '';
    const maintenanceType = searchParams.get('maintenanceType') || '';
    const status = searchParams.get('status') || '';

    let where = 'WHERE p.deleted = 0';
    const params: any[] = [];
    if (planNo) { where += ' AND p.plan_no LIKE ?'; params.push('%' + planNo + '%'); }
    if (maintenanceType) { where += ' AND p.maintenance_type = ?'; params.push(Number(maintenanceType)); }
    if (status) { where += ' AND p.status = ?'; params.push(Number(status)); }

    const totalRows: any = await query('SELECT COUNT(*) as total FROM eqp_maintenance_plan p ' + where, params);
    const total = totalRows[0]?.total || 0;
    const rows: any = await query(
      'SELECT p.*, e.equipment_code, e.equipment_name FROM eqp_maintenance_plan p LEFT JOIN eqp_equipment e ON p.equipment_id = e.id ' + where + ' ORDER BY p.plan_date ASC LIMIT ? OFFSET ?',
      [...params, pageSize, (page - 1) * pageSize]
    );

    return successResponse({ list: rows, total, page, pageSize, type: 'plan' });
  }

  const recordNo = searchParams.get('recordNo') || '';
  const maintenanceType = searchParams.get('maintenanceType') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE r.deleted = 0';
  const params: any[] = [];
  if (recordNo) { where += ' AND r.record_no LIKE ?'; params.push('%' + recordNo + '%'); }
  if (maintenanceType) { where += ' AND r.maintenance_type = ?'; params.push(Number(maintenanceType)); }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM eqp_maintenance_record r ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query(
    'SELECT r.*, e.equipment_code, e.equipment_name FROM eqp_maintenance_record r LEFT JOIN eqp_equipment e ON r.equipment_id = e.id ' + where + ' ORDER BY r.create_time DESC LIMIT ? OFFSET ?',
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list: rows, total, page, pageSize, type: 'record' });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { type } = body;

  if (type === 'plan') {
    const { equipment_id, maintenance_type, cycle_type, cycle_value, plan_date, responsible_id, content, remark } = body;
    if (!equipment_id) return errorResponse('设备ID不能为空', 400, 400);

    const now = new Date();
    const planNo = 'MP' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    const result: any = await execute(
      'INSERT INTO eqp_maintenance_plan (plan_no, equipment_id, maintenance_type, cycle_type, cycle_value, plan_date, responsible_id, content, status, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)',
      [planNo, equipment_id, maintenance_type || 1, cycle_type || 1, cycle_value || 30, plan_date, responsible_id || null, content || null, remark || null]
    );

    return successResponse({ id: result.insertId, plan_no: planNo }, '保养计划创建成功');
  }

  const { plan_id, equipment_id, maintenance_type, fault_desc, maintenance_content, start_time, end_time, downtime_hours, cost, responsible_id, result: maintResult, remark } = body;
  if (!equipment_id) return errorResponse('设备ID不能为空', 400, 400);

  const now = new Date();
  const recordNo = 'MR' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const result: any = await transaction(async (conn) => {
    const [recordRes]: any = await conn.execute(
      'INSERT INTO eqp_maintenance_record (record_no, plan_id, equipment_id, maintenance_type, fault_desc, maintenance_content, start_time, end_time, downtime_hours, cost, responsible_id, result, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [recordNo, plan_id || null, equipment_id, maintenance_type || 1, fault_desc || null, maintenance_content || null, start_time, end_time || null, downtime_hours || 0, cost || 0, responsible_id || null, maintResult || 1, remark || null]
    );

    if (plan_id) {
      await conn.execute(
        'UPDATE eqp_maintenance_plan SET status = 3, complete_date = CURDATE() WHERE id = ? AND deleted = 0',
        [plan_id]
      );
    }

    return { id: recordRes.insertId, record_no: recordNo };
  });

  return successResponse(result, '保养记录创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { type, id } = body;

  if (!id) return errorResponse('ID不能为空', 400, 400);

  if (type === 'plan') {
    const { status, maintenance_type, cycle_type, cycle_value, plan_date, content, remark } = body;

    if (status !== undefined) {
      await execute('UPDATE eqp_maintenance_plan SET status = ? WHERE id = ? AND deleted = 0', [status, id]);
    }
    if (maintenance_type !== undefined) {
      await execute('UPDATE eqp_maintenance_plan SET maintenance_type = ? WHERE id = ? AND deleted = 0', [maintenance_type, id]);
    }
    if (cycle_type !== undefined) {
      await execute('UPDATE eqp_maintenance_plan SET cycle_type = ? WHERE id = ? AND deleted = 0', [cycle_type, id]);
    }
    if (cycle_value !== undefined) {
      await execute('UPDATE eqp_maintenance_plan SET cycle_value = ? WHERE id = ? AND deleted = 0', [cycle_value, id]);
    }
    if (plan_date !== undefined) {
      await execute('UPDATE eqp_maintenance_plan SET plan_date = ? WHERE id = ? AND deleted = 0', [plan_date, id]);
    }
    if (content !== undefined) {
      await execute('UPDATE eqp_maintenance_plan SET content = ? WHERE id = ? AND deleted = 0', [content, id]);
    }
    if (remark !== undefined) {
      await execute('UPDATE eqp_maintenance_plan SET remark = ? WHERE id = ? AND deleted = 0', [remark, id]);
    }

    return successResponse(null, '保养计划更新成功');
  }

  const { maintenance_content, end_time, downtime_hours, cost, result: maintResult, remark } = body;

  if (maintenance_content !== undefined) {
    await execute('UPDATE eqp_maintenance_record SET maintenance_content = ? WHERE id = ? AND deleted = 0', [maintenance_content, id]);
  }
  if (end_time !== undefined) {
    await execute('UPDATE eqp_maintenance_record SET end_time = ? WHERE id = ? AND deleted = 0', [end_time, id]);
  }
  if (downtime_hours !== undefined) {
    await execute('UPDATE eqp_maintenance_record SET downtime_hours = ? WHERE id = ? AND deleted = 0', [downtime_hours, id]);
  }
  if (cost !== undefined) {
    await execute('UPDATE eqp_maintenance_record SET cost = ? WHERE id = ? AND deleted = 0', [cost, id]);
  }
  if (maintResult !== undefined) {
    await execute('UPDATE eqp_maintenance_record SET result = ? WHERE id = ? AND deleted = 0', [maintResult, id]);
  }
  if (remark !== undefined) {
    await execute('UPDATE eqp_maintenance_record SET remark = ? WHERE id = ? AND deleted = 0', [remark, id]);
  }

  return successResponse(null, '保养记录更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type') || 'plan';

  if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });

  if (type === 'plan') {
    await execute('UPDATE eqp_maintenance_plan SET deleted = 1 WHERE id = ?', [Number(id)]);
  } else {
    await execute('UPDATE eqp_maintenance_record SET deleted = 1 WHERE id = ?', [Number(id)]);
  }

  return successResponse(null, '删除成功');
});
