import { NextRequest } from 'next/server';
import { query, execute, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

/**
 * 设备状态监控 API
 *
 * GET  /api/equipment/status              — 返回所有设备当前状态 + 统计概览
 * PUT  /api/equipment/status?id=N&status=1 — 更新单台设备运行状态
 *
 * 状态定义（eqp_equipment.current_status）:
 *   1 - 运行
 *   2 - 待机
 *   3 - 维修
 *   4 - 停机
 */

const VALID_STATUS = [1, 2, 3, 4];

// GET /api/equipment/status
export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const equipmentId = searchParams.get('equipmentId');
  const currentStatus = searchParams.get('currentStatus');

  const conditions: string[] = ['e.deleted = 0'];
  const params: SqlValue[] = [];

  if (equipmentId) {
    conditions.push('e.id = ?');
    params.push(Number(equipmentId));
  }
  if (currentStatus) {
    conditions.push('e.current_status = ?');
    params.push(Number(currentStatus));
  }

  const whereClause = conditions.join(' AND ');

  // 统计各状态数量
  const statsRows = await query(
    `SELECT current_status, COUNT(*) as cnt
     FROM eqp_equipment
     WHERE deleted = 0
     GROUP BY current_status`,
    []
  );

  const stats: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const row of statsRows as { current_status: number | null; cnt: number }[]) {
    const s = row.current_status || 1;
    stats[s] = row.cnt;
  }

  const total = stats[1] + stats[2] + stats[3] + stats[4];

  // 设备列表（含状态信息）
  const rows = await query(
    `SELECT e.id, e.equipment_code, e.equipment_name, e.equipment_type, e.model,
            e.manufacturer, e.workshop_id, e.location,
            e.current_status, e.status as enable_status,
            e.oee, e.availability, e.performance, e.quality_rate,
            e.total_run_hours, e.last_maintenance_date, e.next_maintenance_date,
            e.update_time
     FROM eqp_equipment e
     WHERE ${whereClause}
     ORDER BY e.current_status ASC, e.id ASC`,
    params
  );

  return successResponse({
    list: rows,
    stats,
    total,
  });
});

// PUT /api/equipment/status?id=N&status=1
export const PUT = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json().catch(() => ({}));
    const status = Number(searchParams.get('status') ?? body.status);

    if (!id) return errorResponse('缺少设备ID', 400);
    if (!VALID_STATUS.includes(status)) {
      return errorResponse(`无效的状态值，可选：${VALID_STATUS.join(', ')}`, 400);
    }

    const existRows = await query(
      'SELECT id, equipment_code, equipment_name FROM eqp_equipment WHERE id = ? AND deleted = 0',
      [Number(id)]
    );
    if (!existRows || existRows.length === 0) {
      return errorResponse('设备不存在', 404);
    }

    await execute(
      'UPDATE eqp_equipment SET current_status = ?, update_time = NOW() WHERE id = ? AND deleted = 0',
      [status, Number(id)]
    );

    return successResponse({ id: Number(id), current_status: status }, '设备状态已更新');
  },
  { logTitle: '更新设备状态', logType: 'business' }
);
