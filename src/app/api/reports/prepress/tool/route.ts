import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '30';
  const days = parseInt(period);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  const typeStatusStats = await query(
    `SELECT
      tool_type,
      status,
      COUNT(*) as count,
      COALESCE(SUM(net_value), 0) as total_net_value,
      COALESCE(SUM(original_cost), 0) as total_original_cost
    FROM dcprint_tool
    WHERE deleted = 0
    GROUP BY tool_type, status
    ORDER BY tool_type, status`
  );

  const usageStats = await query(
    `SELECT
      t.tool_type,
      COALESCE(SUM(u.use_count), 0) as total_usage,
      COALESCE(SUM(u.amortized_cost), 0) as total_amortized_cost,
      COUNT(DISTINCT u.tool_id) as active_tools,
      COUNT(DISTINCT u.work_order_id) as affected_orders
    FROM dcprint_tool_usage u
    INNER JOIN dcprint_tool t ON t.id = u.tool_id
    WHERE u.use_time >= ?
    GROUP BY t.tool_type`,
    [startDateStr]
  );

  const recentActivities = await query(
    `SELECT
      t.tool_code, t.tool_name,
      CASE WHEN t.tool_type = 1 THEN '刀模' WHEN t.tool_type = 2 THEN '网版' ELSE '其他' END as tool_type_label,
      u.use_count, u.amortized_cost, u.process_name, u.use_time
    FROM dcprint_tool_usage u
    INNER JOIN dcprint_tool t ON t.id = u.tool_id
    WHERE u.use_time >= ?
    ORDER BY u.use_time DESC
    LIMIT 20`,
    [startDateStr]
  );

  const productCostSummary = await query(
    `SELECT
      t.tool_type,
      COUNT(*) as total,
      COALESCE(SUM(t.original_cost), 0) as total_original_cost,
      COALESCE(SUM(t.accumulated_cost), 0) as total_accumulated_cost,
      COALESCE(SUM(t.net_value), 0) as total_net_value
    FROM dcprint_tool t
    WHERE t.deleted = 0
    GROUP BY t.tool_type`
  );

  const screenPlateDetail = await query(
    `SELECT
      t.tool_code, t.tool_name, t.mesh_count, t.tension_value,
      t.reclaim_count, t.last_reclaim_date, t.last_clean_date,
      t.status, t.remain_life, t.total_life
    FROM dcprint_tool t
    WHERE t.deleted = 0 AND t.tool_type = 2
    ORDER BY t.tension_value ASC`
  );

  return successResponse({
    period: `${days}天`,
    typeStatusStats,
    usageStats,
    recentActivities,
    productCostSummary,
    screenPlateDetail,
  });
});
