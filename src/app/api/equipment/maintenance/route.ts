import { getTranslations } from 'next-intl/server';

import { NextRequest } from 'next/server';
import { query, execute, SqlValue } from '@/lib/db';
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
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);

  const id = searchParams.get('id');
  if (id) {
    const rows = await query(
      `SELECT r.*, e.equipment_code, e.equipment_name, e.model
       FROM eqp_maintenance_record r
       LEFT JOIN eqp_equipment e ON r.equipment_id = e.id
       WHERE r.id = ? AND r.deleted = 0`,
      [Number(id)]
    );
    if (!rows || rows.length === 0) {
      return errorResponse(ts('k_1kxzz1g'), 404, 404);
    }
    return successResponse(rows[0]);
  }

  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const equipmentId = searchParams.get('equipment_id') || '';
  const maintenanceType = searchParams.get('maintenance_type') || '';
  const startDate = searchParams.get('start_date') || '';
  const endDate = searchParams.get('end_date') || '';

  let where = 'WHERE r.deleted = 0';
  const params: SqlValue[] = [];

  if (equipmentId) {
    where += ' AND r.equipment_id = ?';
    params.push(Number(equipmentId));
  }
  if (maintenanceType) {
    where += ' AND r.maintenance_type = ?';
    params.push(maintenanceType);
  }
  if (startDate) {
    where += ' AND r.maintenance_date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    where += ' AND r.maintenance_date <= ?';
    params.push(endDate);
  }

  const countRows = await query(
    `SELECT COUNT(*) as total FROM eqp_maintenance_record r ${where}`,
    params
  );
  const total = countRows[0]?.total || 0;

  const rows = await query(
    `SELECT r.id, r.record_no, r.equipment_id, r.plan_id, r.maintenance_type,
            r.maintenance_date, r.start_time, r.end_time, r.downtime_hours,
            r.cost, r.responsible_id, r.result, r.remark,
            r.create_time,
            e.equipment_code, e.equipment_name, e.model
     FROM eqp_maintenance_record r
     LEFT JOIN eqp_equipment e ON r.equipment_id = e.id
     ${where}
     ORDER BY r.maintenance_date DESC, r.start_time DESC, r.id DESC
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
      plan_id,
      maintenance_type,
      maintenance_date,
      start_time,
      end_time,
      downtime_hours,
      cost,
      responsible_id,
      maintenance_content,
      fault_desc,
      result,
      remark,
    } = body;

    if (!equipment_id) {
      return errorResponse(ts('k_1trm375'), 400, 400);
    }

    // 字段别名兼容：优先使用 maintenance_content，回退到 fault_desc
    const finalMaintenanceContent =
      maintenance_content != null ? maintenance_content : (fault_desc != null ? fault_desc : null);

    // result 兼容：前端可能传 1/2/3，后端按语义字符串存储
    const resultMap: Record<string, string> = {
      '1': 'completed',
      '2': 'partial',
      '3': 'failed',
    };
    const resultVal =
      result !== undefined && result !== null && result !== ''
        ? resultMap[String(result)] || String(result)
        : 'completed';

    // 验证设备存在
    const equipRows = await query('SELECT id FROM eqp_equipment WHERE id = ? AND deleted = 0', [
      Number(equipment_id),
    ]);
    if (!equipRows || equipRows.length === 0) {
      return errorResponse(ts('k_19l0z6t'), 404, 404);
    }

    // 生成记录编号
    const now = new Date();
    const recordNo =
      'MR' +
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    const result2 = await execute(
      `INSERT INTO eqp_maintenance_record
       (record_no, equipment_id, plan_id, maintenance_type, maintenance_date, fault_desc, maintenance_content,
        start_time, end_time, downtime_hours, cost, responsible_id, result, remark, create_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recordNo,
        Number(equipment_id),
        plan_id || null,
        maintenance_type || 'routine',
        maintenance_date || null,
        fault_desc || null,
        finalMaintenanceContent,
        start_time || null,
        end_time || null,
        downtime_hours || 0,
        cost || 0,
        responsible_id || null,
        resultVal,
        remark || null,
        userInfo?.userId || null,
      ]
    );

    // 若关联维保计划，更新计划的 complete_date
    if (plan_id) {
      await execute(
        `UPDATE eqp_maintenance_plan
         SET complete_date = CURDATE(), update_time = NOW()
         WHERE id = ? AND deleted = 0`,
        [Number(plan_id)]
      );
    }

    return successResponse({ id: result2.insertId, record_no: recordNo }, ts('k_u00p3l'));
  },
  { logTitle: '创建维保记录', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) return errorResponse(ts('k_32pxya'), 400, 400);

    const allowedFields = [
      'maintenance_type',
      'maintenance_date',
      'start_time',
      'end_time',
      'downtime_hours',
      'cost',
      'responsible_id',
      'result',
      'remark',
      'fault_desc',
      'maintenance_content',
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
      `UPDATE eqp_maintenance_record SET ${updateFields.join(', ')} WHERE id = ? AND deleted = 0`,
      updateValues
    );

    return successResponse(null, ts('k_1795bzg'));
  },
  { logTitle: '更新维保记录', logType: 'business' }
);

export const DELETE = withPermission(
  async (request: NextRequest, userInfo) => {
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse(ts('k_32pxya'), 400, 400);

    await execute('UPDATE eqp_maintenance_record SET deleted = 1, update_by = ? WHERE id = ?', [
      userInfo?.userId || null,
      Number(id),
    ]);

    return successResponse(null, ts('k_1hlqs'));
  },
  { logTitle: '删除维保记录', logType: 'business' }
);
