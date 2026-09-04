import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query, execute, transaction, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { autoSchedule, getCapacityLoad, type SchedulingResult } from '@/lib/production-scheduling';

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);

  // auto-schedule / preview：仅计算不写入，返回排产建议
  if (searchParams.get('action') === 'auto-schedule' || searchParams.get('action') === 'preview') {
    const workOrderIds = searchParams
      .get('work_order_ids')
      ?.split(',')
      .map(Number)
      .filter((n) => Number.isFinite(n) && n > 0);
    const warehouseId = Number(searchParams.get('warehouse_id') || 0);
    const startDate = searchParams.get('start_date') || undefined;

    const results = await autoSchedule({
      workOrderIds: workOrderIds?.length ? workOrderIds : undefined,
      warehouseId: warehouseId || undefined,
      startDate,
    });

    return successResponse({
      scheduled_count: results.length,
      ready_count: results.filter((r) => r.material_ready).length,
      shortage_count: results.filter((r) => !r.material_ready).length,
      results,
    });
  }

  // 产能负荷：按日期范围查询各工作日的排产负荷
  if (searchParams.get('action') === 'capacity-load') {
    const startDate = searchParams.get('start_date') || new Date().toISOString().slice(0, 10);
    const endDate =
      searchParams.get('end_date') ||
      new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    const results = await getCapacityLoad({ startDate, endDate });
    return successResponse({
      date_range: { start: startDate, end: endDate },
      total_working_days: results.length,
      overloaded_days: results.filter((r) => r.loadPercentage > 100).length,
      results,
    });
  }

  if (searchParams.get('action') === 'stats') {
    const statsRows = await query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as producing,
        SUM(CASE WHEN status = 4 THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 5 THEN 1 ELSE 0 END) as cancelled,
        COALESCE(SUM(planned_qty), 0) as total_planned_qty,
        COALESCE(SUM(completed_qty), 0) as total_completed_qty
      FROM prd_schedule WHERE deleted = 0`
    );
    return successResponse(statsRows[0]);
  }

  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const workshop = searchParams.get('workshop') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE deleted = 0';
  const params: SqlValue[] = [];
  if (workshop) {
    where += ' AND workshop = ?';
    params.push(workshop);
  }
  if (status !== '') {
    where += ' AND status = ?';
    params.push(Number(status));
  }

  const totalRows = await query('SELECT COUNT(*) as total FROM prd_schedule ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows = await query(
    'SELECT * FROM prd_schedule ' +
      where +
      ' ORDER BY planned_start ASC, priority ASC LIMIT ? OFFSET ?',
    [...params, pageSize, (page - 1) * pageSize]
  );
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();

    // confirm / apply-schedule：确认并落库排产建议（写入 plan_start_date / plan_end_date）
    if (body.action === 'confirm' || body.action === 'apply-schedule') {
      const { scheduling_results } = body as {
        action: string;
        scheduling_results: SchedulingResult[];
      };

      if (!Array.isArray(scheduling_results) || scheduling_results.length === 0) {
        return errorResponse(ts('k_1j2m5s3'), 400, 400);
      }

      const updated = await transaction(async (connection) => {
        let count = 0;
        for (const result of scheduling_results) {
          await connection.execute(
            `UPDATE prod_work_order
           SET plan_start_date = ?, plan_end_date = ?, status = 'released', update_time = NOW()
           WHERE id = ? AND deleted = 0 AND status IN ('pending', 'confirmed')`,
            [result.suggested_start_date, result.suggested_end_date, result.work_order_id]
          );
          count++;
        }
        return count;
      });

      return successResponse(
        { updated_count: updated },
        `排产结果应用成功，共更新 ${updated} 个工单`
      );
    }

    const {
      order_id,
      order_no,
      product_id,
      product_code,
      product_name,
      workshop,
      planned_qty,
      planned_start,
      planned_end,
      priority,
      scheduler,
      remark,
    } = body;

    if (!product_name) return errorResponse(ts('k_1bhfx0a'), 400, 400);

    if (planned_start && planned_end && workshop) {
      const conflicts = await query(
        `SELECT id, schedule_no, product_name, planned_start, planned_end 
       FROM prd_schedule 
       WHERE workshop = ? AND deleted = 0 AND status IN (1, 2, 3)
       AND planned_start < ? AND planned_end > ?`,
        [workshop, planned_end, planned_start]
      );
      if (conflicts.length > 0) {
        return errorResponse(
          `排产冲突: 车间 ${workshop} 在 ${planned_start} ~ ${planned_end} 已有 ${conflicts.length} 个排产计划`,
          409,
          409
        );
      }
    }

    const now = new Date();
    const scheduleNo =
      'PS' +
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    const result = await execute(
      `INSERT INTO prd_schedule (schedule_no, order_id, order_no, product_id, product_code, product_name, workshop, planned_qty, planned_start, planned_end, priority, scheduler, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        scheduleNo,
        order_id || null,
        order_no || null,
        product_id || null,
        product_code || null,
        product_name,
        workshop || 'die_cut',
        planned_qty || 0,
        planned_start || null,
        planned_end || null,
        priority || 2,
        scheduler || null,
        remark || null,
      ]
    );

    const scheduleId = result.insertId;

    // 如果指定了工单ID，同步更新工单状态和计划日期
    const workOrderId = body.work_order_id;
    if (workOrderId && scheduleId) {
      await execute(
        `UPDATE prod_work_order
         SET status = 'released', plan_start_date = ?, plan_end_date = ?, update_time = NOW()
         WHERE id = ? AND deleted = 0 AND status = 'pending'`,
        [planned_start || null, planned_end || null, workOrderId]
      );
      // 更新排产记录的工单关联
      await execute('UPDATE prd_schedule SET work_order_id = ? WHERE id = ?', [
        workOrderId,
        scheduleId,
      ]);
    }

    return successResponse({ id: scheduleId, schedule_no: scheduleNo }, ts('k_1pz160t'));
  },
  { logTitle: '创建排产计划', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return errorResponse(ts('k_32pxya'), 400, 400);

    const updateFields: string[] = [];
    const updateValues: SqlValue[] = [];
    const allowedFields = [
      'workshop',
      'planned_qty',
      'completed_qty',
      'planned_start',
      'planned_end',
      'actual_start',
      'actual_end',
      'priority',
      'status',
      'scheduler',
      'remark',
    ];
    for (const field of allowedFields) {
      if (fields[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(fields[field]);
      }
    }
    if (updateFields.length > 0) {
      await execute(
        `UPDATE prd_schedule SET ${updateFields.join(', ')} WHERE id = ? AND deleted = 0`,
        [...updateValues, id]
      );
    }
    return successResponse(null, ts('k_1795bzg'));
  },
  { logTitle: '更新排产计划', logType: 'business' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse(ts('k_32pxya'), 400, 400);

    // 查询排产记录，判断是否需要回退工单状态
    const schedule = await query(
      'SELECT work_order_id, status FROM prd_schedule WHERE id = ? AND deleted = 0',
      [id]
    );

    if (schedule.length > 0 && schedule[0].work_order_id && schedule[0].status === 2) {
      // 状态为2（已排产）的排产被删除时，回退工单状态为 pending
      await execute(
        `UPDATE prod_work_order
         SET status = 'pending', plan_start_date = NULL, plan_end_date = NULL, update_time = NOW()
         WHERE id = ? AND deleted = 0 AND status = 'released'`,
        [schedule[0].work_order_id]
      );
    }

    await execute('UPDATE prd_schedule SET deleted = 1 WHERE id = ?', [id]);
    return successResponse(null, ts('k_1hlqs'));
  },
  { logTitle: '删除排产计划', logType: 'business' }
);
