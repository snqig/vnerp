import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

/**
 * 设备维保计划管理 API
 *
 * GET    /api/equipment/plan                       — 分页查询维保计划
 * GET    /api/equipment/plan?id=N                  — 查询单条维保计划
 * GET    /api/equipment/plan?action=due-soon       — 查询即将到期的维保计划（lead_days 提醒窗口）
 * GET    /api/equipment/plan?equipment_id=N        — 按设备查询维保计划
 * POST   /api/equipment/plan                       — 创建维保计划（自动计算 next_execute_date）
 * PUT    /api/equipment/plan                       — 更新维保计划
 * DELETE /api/equipment/plan?id=N                  — 删除维保计划（软删除）
 */

const CYCLE_DAYS: Record<string, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

function calcNextExecuteDate(
  cycleType: string,
  cycleDays: number,
  baseDate: Date = new Date()
): string {
  const days = cycleType === 'custom' ? Number(cycleDays || 30) : CYCLE_DAYS[cycleType] || 30;
  const next = new Date(baseDate);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

export const GET = withPermission(async (request: NextRequest, userInfo) => {
  const { searchParams } = new URL(request.url);

  // 即将到期提醒：查询 next_execute_date 在 lead_days 窗口内的计划
  if (searchParams.get('action') === 'due-soon') {
    const rows: any = await query(
      `SELECT p.id, p.plan_no, p.plan_name, p.equipment_id, p.maintenance_type,
              p.cycle_type, p.cycle_days, p.lead_days, p.next_execute_date,
              p.last_executed_date, p.status,
              e.equipment_code, e.equipment_name, e.model, e.workshop
       FROM eq_maintenance_plan p
       LEFT JOIN eq_equipment e ON p.equipment_id = e.id
       WHERE p.deleted = 0 AND p.status = 1
         AND p.next_execute_date IS NOT NULL
         AND p.next_execute_date <= DATE_ADD(CURDATE(), INTERVAL p.lead_days DAY)
       ORDER BY p.next_execute_date ASC`
    );
    return successResponse({
      total: rows.length,
      list: rows,
    });
  }

  const id = searchParams.get('id');
  if (id) {
    const rows: any = await query(
      `SELECT p.*, e.equipment_code, e.equipment_name, e.model
       FROM eq_maintenance_plan p
       LEFT JOIN eq_equipment e ON p.equipment_id = e.id
       WHERE p.id = ? AND p.deleted = 0`,
      [Number(id)]
    );
    if (!rows || rows.length === 0) {
      return errorResponse('维保计划不存在', 404, 404);
    }
    return successResponse(rows[0]);
  }

  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const equipmentId = searchParams.get('equipment_id') || '';
  const maintenanceType = searchParams.get('maintenance_type') || '';
  const cycleType = searchParams.get('cycle_type') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE p.deleted = 0';
  const params: any[] = [];

  if (equipmentId) {
    where += ' AND p.equipment_id = ?';
    params.push(Number(equipmentId));
  }
  if (maintenanceType) {
    where += ' AND p.maintenance_type = ?';
    params.push(maintenanceType);
  }
  if (cycleType) {
    where += ' AND p.cycle_type = ?';
    params.push(cycleType);
  }
  if (status) {
    where += ' AND p.status = ?';
    params.push(Number(status));
  }

  const countRows: any = await query(
    `SELECT COUNT(*) as total FROM eq_maintenance_plan p ${where}`,
    params
  );
  const total = countRows[0]?.total || 0;

  const rows: any = await query(
    `SELECT p.id, p.plan_no, p.plan_name, p.equipment_id, p.maintenance_type,
            p.cycle_type, p.cycle_days, p.lead_days, p.estimated_hours,
            p.estimated_cost, p.status, p.last_executed_date, p.next_execute_date,
            p.create_time,
            e.equipment_code, e.equipment_name, e.workshop
     FROM eq_maintenance_plan p
     LEFT JOIN eq_equipment e ON p.equipment_id = e.id
     ${where}
     ORDER BY p.next_execute_date ASC, p.id DESC
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
      plan_name,
      maintenance_type,
      cycle_type,
      cycle_days,
      lead_days,
      estimated_hours,
      estimated_cost,
      checklist,
      status,
      remark,
    } = body;

    if (!equipment_id || !plan_name) {
      return errorResponse('设备ID和计划名称不能为空', 400, 400);
    }

    // 验证设备存在
    const equipRows: any = await query('SELECT id FROM eq_equipment WHERE id = ? AND deleted = 0', [
      Number(equipment_id),
    ]);
    if (!equipRows || equipRows.length === 0) {
      return errorResponse('设备不存在', 404, 404);
    }

    // 生成计划编号
    const now = new Date();
    const planNo =
      'MP' +
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    const effectiveCycleType = cycle_type || 'monthly';
    const effectiveCycleDays = Number(cycle_days || 30);
    const nextExecuteDate = calcNextExecuteDate(effectiveCycleType, effectiveCycleDays);

    const result: any = await execute(
      `INSERT INTO eq_maintenance_plan
       (plan_no, equipment_id, plan_name, maintenance_type, cycle_type, cycle_days,
        lead_days, estimated_hours, estimated_cost, checklist, status,
        next_execute_date, remark, create_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        planNo,
        Number(equipment_id),
        plan_name,
        maintenance_type || 'routine',
        effectiveCycleType,
        effectiveCycleDays,
        Number(lead_days || 7),
        Number(estimated_hours || 4),
        Number(estimated_cost || 0),
        checklist ? JSON.stringify(checklist) : null,
        Number(status || 1),
        nextExecuteDate,
        remark || null,
        userInfo?.userId || null,
      ]
    );

    return successResponse(
      { id: result.insertId, plan_no: planNo, next_execute_date: nextExecuteDate },
      '维保计划创建成功'
    );
  },
  { logTitle: '创建维保计划', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, userInfo) => {
    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) return errorResponse('ID不能为空', 400, 400);

    const allowedFields = [
      'plan_name',
      'maintenance_type',
      'cycle_type',
      'cycle_days',
      'lead_days',
      'estimated_hours',
      'estimated_cost',
      'checklist',
      'status',
      'last_executed_date',
      'next_execute_date',
      'remark',
    ];

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    for (const field of allowedFields) {
      if (fields[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(
          field === 'checklist' && fields[field] ? JSON.stringify(fields[field]) : fields[field]
        );
      }
    }

    if (updateFields.length === 0) {
      return errorResponse('没有可更新的字段', 400, 400);
    }

    // 如果更新了周期，且未显式提供 next_execute_date，则重新计算
    if (
      (fields.cycle_type !== undefined || fields.cycle_days !== undefined) &&
      fields.next_execute_date === undefined
    ) {
      const current: any = await query(
        'SELECT cycle_type, cycle_days, last_executed_date FROM eq_maintenance_plan WHERE id = ? AND deleted = 0',
        [Number(id)]
      );
      if (current && current.length > 0) {
        const cycleType = fields.cycle_type || current[0].cycle_type;
        const cycleDays = fields.cycle_days || current[0].cycle_days;
        const baseDate = current[0].last_executed_date
          ? new Date(current[0].last_executed_date)
          : new Date();
        updateFields.push('next_execute_date = ?');
        updateValues.push(calcNextExecuteDate(cycleType, Number(cycleDays), baseDate));
      }
    }

    updateFields.push('update_by = ?');
    updateValues.push(userInfo?.userId || null);
    updateValues.push(Number(id));

    await execute(
      `UPDATE eq_maintenance_plan SET ${updateFields.join(', ')} WHERE id = ? AND deleted = 0`,
      updateValues
    );

    return successResponse(null, '更新成功');
  },
  { logTitle: '更新维保计划', logType: 'business' }
);

export const DELETE = withPermission(
  async (request: NextRequest, userInfo) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse('ID不能为空', 400, 400);

    await execute('UPDATE eq_maintenance_plan SET deleted = 1, update_by = ? WHERE id = ?', [
      userInfo?.userId || null,
      Number(id),
    ]);

    return successResponse(null, '删除成功');
  },
  { logTitle: '删除维保计划', logType: 'business' }
);
