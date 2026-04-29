import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction } from '@/lib/db';
import { successResponse, errorResponse, commonErrors, withErrorHandler, validateRequestBody } from '@/lib/api-response';

const MAINTENANCE_TYPE_MAP: Record<string, string> = {
  routine: '常规保养',
  grinding: '磨刃/修版',
  re_rule: '重做/翻新',
  replace: '更换',
};

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const die_id = searchParams.get('die_id');
  const maintenance_type = searchParams.get('maintenance_type');
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  let sql = `SELECT m.*, dt.template_name, dt.asset_type, dt.template_code as die_code
    FROM prd_die_maintenance m
    LEFT JOIN prd_die_template dt ON m.die_id = dt.id
    WHERE m.deleted = 0`;
  const values: any[] = [];

  if (die_id) {
    sql += ' AND m.die_id = ?';
    values.push(parseInt(die_id));
  }
  if (maintenance_type) {
    sql += ' AND m.maintenance_type = ?';
    values.push(maintenance_type);
  }
  if (status) {
    sql += ' AND m.status = ?';
    values.push(parseInt(status));
  }

  sql += ' ORDER BY m.create_time DESC LIMIT ? OFFSET ?';
  values.push(pageSize, (page - 1) * pageSize);

  const list = await query(sql, values);

  const countSql = `SELECT COUNT(*) as total FROM prd_die_maintenance WHERE deleted = 0`;
  const countResult = await queryOne(countSql) as any;

  const costStats = await query(
    `SELECT
      maintenance_type,
      COUNT(*) as count,
      COALESCE(SUM(cost), 0) as total_cost,
      AVG(cost) as avg_cost
    FROM prd_die_maintenance WHERE deleted = 0 AND status = 3
    GROUP BY maintenance_type`
  ) as any[];

  const pendingCount = await queryOne(
    `SELECT COUNT(*) as count FROM prd_die_maintenance WHERE deleted = 0 AND status IN (1, 2)`
  ) as any;

  return successResponse({
    list,
    total: countResult?.total || 0,
    page,
    pageSize,
    costStats,
    pendingCount: pendingCount?.count || 0,
    maintenanceTypeMap: MAINTENANCE_TYPE_MAP,
  });
}, '获取保养记录失败');

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const validation = validateRequestBody(body, ['die_id', 'maintenance_type']);
  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  const dieId = parseInt(body.die_id);
  const maintenanceType = body.maintenance_type;

  return await transaction(async (conn) => {
    const [dieRows]: any = await conn.execute(
      'SELECT id, template_code, template_name, cumulative_impressions, max_impressions, warning_threshold, maintenance_interval, maintenance_count, last_maintenance_impressions, die_status FROM prd_die_template WHERE id = ? AND deleted = 0',
      [dieId]
    );
    const die = dieRows?.[0];
    if (!die) return errorResponse('刀模/网版不存在', 404, 404);

    const maintenanceNo = `MT${Date.now()}`;
    const impressionsBefore = die.cumulative_impressions;

    let impressionsAfter = impressionsBefore;
    let nextMaintenanceDate = null;
    let newDieStatus = die.die_status;

    if (maintenanceType === 'routine' || maintenanceType === 'grinding') {
      newDieStatus = 'available';
      if (die.maintenance_interval > 0) {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + Math.ceil(die.maintenance_interval / 10));
        nextMaintenanceDate = nextDate.toISOString().split('T')[0];
      }
    } else if (maintenanceType === 're_rule') {
      impressionsAfter = 0;
      newDieStatus = 'available';
    } else if (maintenanceType === 'replace') {
      impressionsAfter = 0;
      newDieStatus = 'available';
    }

    await conn.execute(
      `INSERT INTO prd_die_maintenance (maintenance_no, die_id, die_code, maintenance_type, impressions_before, impressions_after, maintenance_date, next_maintenance_date, cost, technician_id, technician_name, status, remark)
       VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?)`,
      [
        maintenanceNo, dieId, die.template_code, maintenanceType,
        impressionsBefore, impressionsAfter,
        nextMaintenanceDate,
        body.cost || 0,
        body.technician_id || null,
        body.technician_name || null,
        body.status || 1,
        body.remark || null,
      ]
    );

    if (body.status === 3 || body.complete_immediately) {
      const newMaintenanceCount = die.maintenance_count + 1;
      await conn.execute(
        `UPDATE prd_die_template
         SET cumulative_impressions = ?,
             current_usage = ?,
             remaining_usage = GREATEST(max_usage - ?, 0),
             maintenance_count = ?,
             last_maintenance_impressions = ?,
             last_maintenance_date = CURDATE(),
             die_status = ?,
             status = 1
         WHERE id = ?`,
        [impressionsAfter, impressionsAfter, impressionsAfter,
         newMaintenanceCount, impressionsBefore, newDieStatus, dieId]
      );
    }

    return successResponse({
      maintenance_no: maintenanceNo,
      die_id: dieId,
      maintenance_type: maintenanceType,
      impressions_before: impressionsBefore,
      impressions_after: impressionsAfter,
      new_die_status: newDieStatus,
    }, '保养记录创建成功');
  });
}, '创建保养记录失败');

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  if (!body.id) return commonErrors.badRequest('保养ID不能为空');

  const existing = await queryOne('SELECT id, die_id, maintenance_type, status FROM prd_die_maintenance WHERE id = ? AND deleted = 0', [body.id]);
  if (!existing) return commonErrors.notFound('保养记录不存在');

  return await transaction(async (conn) => {
    if (body.status === 3 && existing.status !== 3) {
      const [dieRows]: any = await conn.execute(
        'SELECT id, cumulative_impressions, max_impressions, warning_threshold, maintenance_interval, maintenance_count, last_maintenance_impressions FROM prd_die_template WHERE id = ? AND deleted = 0',
        [existing.die_id]
      );
      const die = dieRows?.[0];
      if (!die) return errorResponse('刀模/网版不存在', 404, 404);

      const impressionsAfter = body.impressions_after !== undefined ? body.impressions_after : (existing.maintenance_type === 're_rule' || existing.maintenance_type === 'replace' ? 0 : die.cumulative_impressions);
      const newMaintenanceCount = die.maintenance_count + 1;
      const newDieStatus = computeDieStatus(impressionsAfter, die.max_impressions, die.warning_threshold);

      await conn.execute(
        `UPDATE prd_die_template
         SET cumulative_impressions = ?,
             current_usage = ?,
             remaining_usage = GREATEST(max_usage - ?, 0),
             maintenance_count = ?,
             last_maintenance_impressions = ?,
             last_maintenance_date = CURDATE(),
             die_status = ?,
             status = CASE
               WHEN ? >= max_impressions THEN 3
               WHEN ? >= max_impressions * warning_threshold / 100 THEN 2
               ELSE 1
             END
         WHERE id = ?`,
        [impressionsAfter, impressionsAfter, impressionsAfter,
         newMaintenanceCount, die.cumulative_impressions,
         newDieStatus, impressionsAfter, impressionsAfter,
         existing.die_id]
      );

      await conn.execute(
        `UPDATE prd_die_maintenance SET status = 3, impressions_after = ?, cost = ?, technician_name = ?, remark = ?, update_time = NOW() WHERE id = ?`,
        [impressionsAfter, body.cost || 0, body.technician_name || null, body.remark || null, body.id]
      );
    } else {
      const fields: string[] = [];
      const values: any[] = [];
      const allowedFields = ['maintenance_type', 'impressions_after', 'next_maintenance_date', 'cost', 'technician_name', 'status', 'remark'];

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          fields.push(`${field} = ?`);
          values.push(body[field]);
        }
      }

      if (fields.length > 0) {
        values.push(body.id);
        await conn.execute(`UPDATE prd_die_maintenance SET ${fields.join(', ')}, update_time = NOW() WHERE id = ?`, values);
      }
    }

    return successResponse(null, '保养记录更新成功');
  });
}, '更新保养记录失败');

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return commonErrors.badRequest('保养ID不能为空');

  await execute('UPDATE prd_die_maintenance SET deleted = 1 WHERE id = ?', [parseInt(id)]);
  return successResponse(null, '删除成功');
}, '删除保养记录失败');

function computeDieStatus(cumulative: number, maxImpressions: number, warningThreshold: number): string {
  if (maxImpressions <= 0) return 'available';
  const pct = (cumulative / maxImpressions) * 100;
  if (pct >= 95) return 're_rule_needed';
  if (pct >= warningThreshold) return 'maintenance_needed';
  return 'available';
}
