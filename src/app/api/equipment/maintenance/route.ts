import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

/**
 * 设备维保记录管理 API
 *
 * GET    /api/equipment/maintenance               — 分页查询维保记录
 * GET    /api/equipment/maintenance?id=N          — 查询单条维保记录
 * GET    /api/equipment/maintenance?equipment_id=N— 按设备查询维保记录
 * POST   /api/equipment/maintenance               — 创建维保记录（同时更新设备 last_maintenance_date）
 * PUT    /api/equipment/maintenance               — 更新维保记录
 * DELETE /api/equipment/maintenance?id=N          — 删除维保记录
 */

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);

  const id = searchParams.get('id');
  if (id) {
    const rows: any = await query(
      `SELECT r.*, e.equipment_code, e.equipment_name, e.model
       FROM eq_maintenance_record r
       LEFT JOIN eq_equipment e ON r.equipment_id = e.id
       WHERE r.id = ? AND r.deleted = 0`,
      [Number(id)]
    );
    if (!rows || rows.length === 0) {
      return errorResponse('维保记录不存在', 404, 404);
    }
    return successResponse(rows[0]);
  }

  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const equipmentId = searchParams.get('equipment_id') || '';
  const maintenanceType = searchParams.get('maintenance_type') || '';
  const status = searchParams.get('status') || '';
  const startDate = searchParams.get('start_date') || '';
  const endDate = searchParams.get('end_date') || '';

  let where = 'WHERE r.deleted = 0';
  const params: any[] = [];

  if (equipmentId) {
    where += ' AND r.equipment_id = ?';
    params.push(Number(equipmentId));
  }
  if (maintenanceType) {
    where += ' AND r.maintenance_type = ?';
    params.push(maintenanceType);
  }
  if (status) {
    where += ' AND r.status = ?';
    params.push(Number(status));
  }
  if (startDate) {
    where += ' AND r.maintenance_date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    where += ' AND r.maintenance_date <= ?';
    params.push(endDate);
  }

  const countRows: any = await query(
    `SELECT COUNT(*) as total FROM eq_maintenance_record r ${where}`,
    params
  );
  const total = countRows[0]?.total || 0;

  const rows: any = await query(
    `SELECT r.id, r.record_no, r.equipment_id, r.plan_id, r.maintenance_type,
            r.maintenance_date, r.start_time, r.end_time, r.actual_hours,
            r.actual_cost, r.technician_name, r.result, r.status, r.remark,
            r.create_time,
            e.equipment_code, e.equipment_name, e.model
     FROM eq_maintenance_record r
     LEFT JOIN eq_equipment e ON r.equipment_id = e.id
     ${where}
     ORDER BY r.maintenance_date DESC, r.id DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withPermission(
  async (request: NextRequest, userInfo) => {
    const body = await request.json();
    const {
      equipment_id,
      plan_id,
      maintenance_type,
      maintenance_date,
      start_time,
      end_time,
      actual_hours,
      actual_cost,
      technician_name,
      run_hours_before,
      run_hours_after,
      description,
      parts_replaced,
      result,
      remark,
    } = body;

    if (!equipment_id || !maintenance_date) {
      return errorResponse('设备ID和维保日期不能为空', 400, 400);
    }

    // 验证设备存在
    const equipRows: any = await query('SELECT id FROM eq_equipment WHERE id = ? AND deleted = 0', [
      Number(equipment_id),
    ]);
    if (!equipRows || equipRows.length === 0) {
      return errorResponse('设备不存在', 404, 404);
    }

    // 生成记录编号
    const now = new Date();
    const recordNo =
      'MR' +
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    const result2: any = await execute(
      `INSERT INTO eq_maintenance_record
       (record_no, equipment_id, plan_id, maintenance_type, maintenance_date,
        start_time, end_time, actual_hours, actual_cost, technician_name,
        run_hours_before, run_hours_after, description, parts_replaced,
        result, status, remark, create_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recordNo,
        Number(equipment_id),
        plan_id || null,
        maintenance_type || 'routine',
        maintenance_date,
        start_time || null,
        end_time || null,
        actual_hours || 0,
        actual_cost || 0,
        technician_name || null,
        run_hours_before || null,
        run_hours_after || null,
        description || null,
        parts_replaced ? JSON.stringify(parts_replaced) : null,
        result || 'completed',
        1,
        remark || null,
        userInfo?.userId || null,
      ]
    );

    // 同步更新设备表的 last_maintenance_date
    await execute(
      `UPDATE eq_equipment SET last_maintenance_date = ?, update_time = NOW() WHERE id = ?`,
      [maintenance_date, Number(equipment_id)]
    );

    // 若关联维保计划，同步计划的 last_executed_date 和 next_execute_date
    if (plan_id) {
      const planRows: any = await query(
        'SELECT cycle_type, cycle_days FROM eq_maintenance_plan WHERE id = ? AND deleted = 0',
        [Number(plan_id)]
      );
      if (planRows && planRows.length > 0) {
        const cycleType = planRows[0].cycle_type;
        const cycleDays = Number(planRows[0].cycle_days || 30);
        const cycleMap: Record<string, number> = {
          daily: 1,
          weekly: 7,
          monthly: 30,
          quarterly: 90,
          yearly: 365,
        };
        const days = cycleType === 'custom' ? cycleDays : cycleMap[cycleType] || 30;
        const nextDate = new Date(maintenance_date);
        nextDate.setDate(nextDate.getDate() + days);
        const nextExecuteDate = nextDate.toISOString().slice(0, 10);

        await execute(
          `UPDATE eq_maintenance_plan
           SET last_executed_date = ?, next_execute_date = ?, update_time = NOW()
           WHERE id = ? AND deleted = 0`,
          [maintenance_date, nextExecuteDate, Number(plan_id)]
        );
      }
    }

    return successResponse({ id: result2.insertId, record_no: recordNo }, '维保记录创建成功');
  },
  { logTitle: '创建维保记录', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, userInfo) => {
    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) return errorResponse('ID不能为空', 400, 400);

    const allowedFields = [
      'maintenance_type',
      'maintenance_date',
      'start_time',
      'end_time',
      'actual_hours',
      'actual_cost',
      'technician_name',
      'run_hours_before',
      'run_hours_after',
      'description',
      'parts_replaced',
      'result',
      'status',
      'remark',
    ];

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    for (const field of allowedFields) {
      if (fields[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(
          field === 'parts_replaced' && fields[field]
            ? JSON.stringify(fields[field])
            : fields[field]
        );
      }
    }

    if (updateFields.length === 0) {
      return errorResponse('没有可更新的字段', 400, 400);
    }

    updateFields.push('update_by = ?');
    updateValues.push(userInfo?.userId || null);
    updateValues.push(Number(id));

    await execute(
      `UPDATE eq_maintenance_record SET ${updateFields.join(', ')} WHERE id = ? AND deleted = 0`,
      updateValues
    );

    return successResponse(null, '更新成功');
  },
  { logTitle: '更新维保记录', logType: 'business' }
);

export const DELETE = withPermission(
  async (request: NextRequest, userInfo) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse('ID不能为空', 400, 400);

    await execute('UPDATE eq_maintenance_record SET deleted = 1, update_by = ? WHERE id = ?', [
      userInfo?.userId || null,
      Number(id),
    ]);

    return successResponse(null, '删除成功');
  },
  { logTitle: '删除维保记录', logType: 'business' }
);
