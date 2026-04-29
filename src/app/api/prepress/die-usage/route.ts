import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction } from '@/lib/db';
import { successResponse, errorResponse, commonErrors, withErrorHandler, validateRequestBody } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const die_id = searchParams.get('die_id');
  const work_order_id = searchParams.get('work_order_id');
  const work_report_id = searchParams.get('work_report_id');
  const start_date = searchParams.get('start_date');
  const end_date = searchParams.get('end_date');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  let sql = `SELECT ul.*, dt.template_name, dt.asset_type, dt.template_code as die_code
    FROM prd_die_usage_log ul
    LEFT JOIN prd_die_template dt ON ul.die_id = dt.id
    WHERE 1=1`;
  const values: any[] = [];

  if (die_id) {
    sql += ' AND ul.die_id = ?';
    values.push(parseInt(die_id));
  }
  if (work_order_id) {
    sql += ' AND ul.work_order_id = ?';
    values.push(parseInt(work_order_id));
  }
  if (work_report_id) {
    sql += ' AND ul.work_report_id = ?';
    values.push(parseInt(work_report_id));
  }
  if (start_date) {
    sql += ' AND ul.usage_date >= ?';
    values.push(start_date);
  }
  if (end_date) {
    sql += ' AND ul.usage_date <= ?';
    values.push(end_date);
  }

  sql += ' ORDER BY ul.create_time DESC LIMIT ? OFFSET ?';
  values.push(pageSize, (page - 1) * pageSize);

  const list = await query(sql, values);

  let countSql = `SELECT COUNT(*) as total FROM prd_die_usage_log ul WHERE 1=1`;
  const countValues: any[] = [];
  if (die_id) { countSql += ' AND ul.die_id = ?'; countValues.push(parseInt(die_id)); }
  if (work_order_id) { countSql += ' AND ul.work_order_id = ?'; countValues.push(parseInt(work_order_id)); }
  if (start_date) { countSql += ' AND ul.usage_date >= ?'; countValues.push(start_date); }
  if (end_date) { countSql += ' AND ul.usage_date <= ?'; countValues.push(end_date); }
  const countResult = await queryOne(countSql, countValues) as any;

  const summaryStats = await query(
    `SELECT
      COUNT(*) as total_records,
      COALESCE(SUM(impressions), 0) as total_impressions,
      COUNT(DISTINCT die_id) as unique_dies_used,
      COUNT(DISTINCT work_order_id) as unique_work_orders
    FROM prd_die_usage_log
    WHERE 1=1
    ${die_id ? ' AND die_id = ?' : ''}
    ${start_date ? ' AND usage_date >= ?' : ''}
    ${end_date ? ' AND usage_date <= ?' : ''}`,
    [die_id, start_date, end_date].filter(Boolean)
  ) as any[];

  return successResponse({
    list,
    total: countResult?.total || 0,
    page,
    pageSize,
    summaryStats: summaryStats[0] || {},
  });
}, '获取刀模使用记录失败');

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const validation = validateRequestBody(body, ['die_id', 'impressions']);
  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  const dieId = parseInt(body.die_id);
  const impressionsToAdd = parseInt(body.impressions);

  if (impressionsToAdd <= 0) {
    return errorResponse('使用次数必须大于0', 400, 400);
  }

  return await transaction(async (conn) => {
    const [dieRows]: any = await conn.execute(
      'SELECT id, template_code, template_name, cumulative_impressions, max_impressions, warning_threshold, pieces_per_impression, die_status FROM prd_die_template WHERE id = ? AND deleted = 0',
      [dieId]
    );
    const die = dieRows?.[0];
    if (!die) return errorResponse('刀模/网版不存在', 404, 404);
    if (die.die_status === 'scrap') return errorResponse('已报废的刀模/网版不能继续使用', 400, 400);
    if (die.die_status === 're_rule_needed') return errorResponse('需重做的刀模/网版请先保养后再使用', 400, 400);

    const actualImpressions = body.actual_qty
      ? Math.ceil(parseInt(body.actual_qty) / (die.pieces_per_impression || 1))
      : impressionsToAdd;

    const newCumulative = die.cumulative_impressions + actualImpressions;
    const newDieStatus = computeDieStatus(newCumulative, die.max_impressions, die.warning_threshold);

    await conn.execute(
      `UPDATE prd_die_template
       SET cumulative_impressions = ?,
           current_usage = ?,
           remaining_usage = GREATEST(max_usage - ?, 0),
           last_used_date = CURDATE(),
           die_status = ?,
           status = CASE
             WHEN ? >= max_impressions THEN 3
             WHEN ? >= max_impressions * warning_threshold / 100 THEN 2
             ELSE 1
           END
       WHERE id = ?`,
      [newCumulative, newCumulative, newCumulative, newDieStatus, newCumulative, newCumulative, dieId]
    );

    await conn.execute(
      `INSERT INTO prd_die_usage_log (die_id, die_code, work_report_id, work_order_id, work_order_no, process_name, impressions, cumulative_after, operator_id, operator_name, equipment_id, usage_date, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?)`,
      [
        dieId, die.template_code,
        body.work_report_id || null,
        body.work_order_id || null,
        body.work_order_no || null,
        body.process_name || null,
        actualImpressions,
        newCumulative,
        body.operator_id || null,
        body.operator_name || null,
        body.equipment_id || null,
        body.remark || null,
      ]
    );

    return successResponse({
      die_id: dieId,
      impressions_added: actualImpressions,
      cumulative_after: newCumulative,
      die_status: newDieStatus,
      usage_pct: die.max_impressions > 0 ? Math.round((newCumulative / die.max_impressions) * 100) : 0,
    }, '刀模使用记录已更新');
  });
}, '记录刀模使用失败');

function computeDieStatus(cumulative: number, maxImpressions: number, warningThreshold: number): string {
  if (maxImpressions <= 0) return 'available';
  const pct = (cumulative / maxImpressions) * 100;
  if (pct >= 95) return 're_rule_needed';
  if (pct >= warningThreshold) return 'maintenance_needed';
  return 'available';
}
