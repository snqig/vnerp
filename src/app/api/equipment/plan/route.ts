import { getTranslations } from 'next-intl/server';

import { NextRequest } from 'next/server';
import { query, execute, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { numericFilter } from '@/lib/query-filter';

/**
 * 设备维保计划管理 API
 *
 * GET    /api/equipment/plan                       — 分页查询维保计划
 * GET    /api/equipment/plan?id=N                  — 查询单条维保计划
 * GET    /api/equipment/plan?action=due-soon       — 查询激活中的维保计划
 * GET    /api/equipment/plan?equipment_id=N        — 按设备查询维保计划
 * POST   /api/equipment/plan                       — 创建维保计划
 * PUT    /api/equipment/plan                       — 更新维保计划
 * DELETE /api/equipment/plan?id=N                  — 删除维保计划（软删除）
 */

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);

  // 查询所有激活中的维保计划
  if (searchParams.get('action') === 'due-soon') {
    const rows = await query(
      `SELECT p.id, p.plan_no, p.equipment_id, p.maintenance_type,
              p.cycle_type, p.cycle_value, p.plan_date,
              p.status,
              e.equipment_code, e.equipment_name, e.model, e.workshop
       FROM eqp_maintenance_plan p
       LEFT JOIN eqp_equipment e ON p.equipment_id = e.id
       WHERE p.deleted = 0 AND p.status = 1
       ORDER BY p.plan_date ASC`
    );
    return successResponse({
      total: rows.length,
      list: rows,
    });
  }

  const id = searchParams.get('id');
  if (id) {
    const rows = await query(
      `SELECT p.*, e.equipment_code, e.equipment_name, e.model
       FROM eqp_maintenance_plan p
       LEFT JOIN eqp_equipment e ON p.equipment_id = e.id
       WHERE p.id = ? AND p.deleted = 0`,
      [Number(id)]
    );
    if (!rows || rows.length === 0) {
      return errorResponse(ts('k_7mif3w'), 404, 404);
    }
    return successResponse(rows[0]);
  }

  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const equipmentId = searchParams.get('equipment_id') || '';
  const maintenanceType = searchParams.get('maintenance_type') || '';
  const cycleType = searchParams.get('cycle_type') || '';
  const status = numericFilter(searchParams.get('status'));

  let where = 'WHERE p.deleted = 0';
  const params: SqlValue[] = [];

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
  const planNo = searchParams.get('planNo') || searchParams.get('plan_no') || '';
  if (planNo) {
    where += ' AND p.plan_no LIKE ?';
    params.push(`%${planNo}%`);
  }

  const countRows = await query(
    `SELECT COUNT(*) as total FROM eqp_maintenance_plan p ${where}`,
    params
  );
  const total = countRows[0]?.total || 0;

  const rows = await query(
    `SELECT p.id, p.plan_no, p.equipment_id, p.maintenance_type,
            p.cycle_type, p.cycle_value, p.plan_date,
            p.responsible_id, p.status, p.complete_date,
            p.create_time,
            e.equipment_code, e.equipment_name, e.workshop
     FROM eqp_maintenance_plan p
     LEFT JOIN eqp_equipment e ON p.equipment_id = e.id
     ${where}
     ORDER BY p.plan_date ASC, p.id DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withPermission(
  async (request: NextRequest, userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const {
      equipment_id,
      maintenance_type,
      cycle_type,
      cycle_value,
      plan_date,
      responsible_id,
      status,
      remark,
    } = body;

    if (!equipment_id) {
      return errorResponse(ts('k_17jwbx9'), 400, 400);
    }

    // 验证设备存在
    const equipRows = await query('SELECT id FROM eqp_equipment WHERE id = ? AND deleted = 0', [
      Number(equipment_id),
    ]);
    if (!equipRows || equipRows.length === 0) {
      return errorResponse(ts('k_19l0z6t'), 404, 404);
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
    const effectiveCycleValue = Number(cycle_value || 30);

    const result = await execute(
      `INSERT INTO eqp_maintenance_plan
       (plan_no, equipment_id, maintenance_type, cycle_type, cycle_value, plan_date,
        responsible_id, status, remark, create_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        planNo,
        Number(equipment_id),
        maintenance_type || 'routine',
        effectiveCycleType,
        effectiveCycleValue,
        plan_date || null,
        responsible_id || null,
        Number(status || 1),
        remark || null,
        userInfo?.userId || null,
      ]
    );

    return successResponse(
      { id: result.insertId, plan_no: planNo },
      ts('k_1iw4rq1')
    );
  },
  { logTitle: '创建维保计划', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) return errorResponse(ts('k_32pxya'), 400, 400);

    const allowedFields = [
      'maintenance_type',
      'cycle_type',
      'cycle_value',
      'plan_date',
      'responsible_id',
      'status',
      'complete_date',
      'remark',
    ];

    const updateFields: string[] = [];
    const updateValues: SqlValue[] = [];

    for (const field of allowedFields) {
      if (fields[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(fields[field]);
      }
    }

    if (updateFields.length === 0) {
      return errorResponse(ts('k_15vo87k'), 400, 400);
    }

    updateFields.push('update_by = ?');
    updateValues.push(userInfo?.userId || null);
    updateValues.push(Number(id));

    await execute(
      `UPDATE eqp_maintenance_plan SET ${updateFields.join(', ')} WHERE id = ? AND deleted = 0`,
      updateValues
    );

    return successResponse(null, ts('k_1795bzg'));
  },
  { logTitle: '更新维保计划', logType: 'business' }
);

export const DELETE = withPermission(
  async (request: NextRequest, userInfo) => {
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse(ts('k_32pxya'), 400, 400);

    await execute('UPDATE eqp_maintenance_plan SET deleted = 1, update_by = ? WHERE id = ?', [
      userInfo?.userId || null,
      Number(id),
    ]);

    return successResponse(null, ts('k_1hlqs'));
  },
  { logTitle: '删除维保计划', logType: 'business' }
);
