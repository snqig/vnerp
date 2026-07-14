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

  const summary = await query(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status IN (4,5) THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 6 THEN 1 ELSE 0 END) as cancelled,
      SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as in_progress,
      COALESCE(SUM(total_cost), 0) as total_cost,
      COALESCE(SUM(total_material_cost), 0) as total_material_cost,
      COALESCE(SUM(total_labor_cost), 0) as total_labor_cost,
      COALESCE(SUM(total_tool_cost), 0) as total_tool_cost
    FROM dcprint_sample_process_card
    WHERE deleted = 0 AND create_time >= ?`,
    [startDateStr]
  );

  const monthlyTrend = await query(
    `SELECT
      DATE_FORMAT(create_time, '%Y-%m') as month,
      COUNT(*) as count,
      SUM(CASE WHEN status IN (4,5) THEN 1 ELSE 0 END) as completed_count,
      COALESCE(SUM(total_cost), 0) as total_cost
    FROM dcprint_sample_process_card
    WHERE deleted = 0 AND create_time >= ?
    GROUP BY DATE_FORMAT(create_time, '%Y-%m')
    ORDER BY month`,
    [startDateStr]
  );

  const topByCustomer = await query(
    `SELECT
      customer_name,
      COUNT(*) as sample_count,
      SUM(CASE WHEN status IN (4,5) THEN 1 ELSE 0 END) as completed_count,
      COALESCE(SUM(total_cost), 0) as total_cost
    FROM dcprint_sample_process_card
    WHERE deleted = 0 AND create_time >= ? AND customer_name IS NOT NULL
    GROUP BY customer_name
    ORDER BY sample_count DESC
    LIMIT 10`,
    [startDateStr]
  );

  const costBreakdown = await query(
    `SELECT
      CASE
        WHEN total_cost <= 1000 THEN '0-1K'
        WHEN total_cost <= 5000 THEN '1K-5K'
        WHEN total_cost <= 10000 THEN '5K-10K'
        WHEN total_cost <= 50000 THEN '10K-50K'
        ELSE '50K+'
      END as cost_range,
      COUNT(*) as count,
      COALESCE(SUM(total_cost), 0) as total_cost
    FROM dcprint_sample_process_card
    WHERE deleted = 0 AND total_cost > 0 AND create_time >= ?
    GROUP BY cost_range
    ORDER BY MIN(total_cost)`,
    [startDateStr]
  );

  const s = (summary[0] || {}) as Loose;

  return successResponse({
    period: `${days}天`,
    summary: {
      total: Number(s.total) || 0,
      completed: Number(s.completed) || 0,
      cancelled: Number(s.cancelled) || 0,
      inProgress: Number(s.in_progress) || 0,
      totalCost: Number(s.total_cost) || 0,
      totalMaterialCost: Number(s.total_material_cost) || 0,
      totalLaborCost: Number(s.total_labor_cost) || 0,
      totalToolCost: Number(s.total_tool_cost) || 0,
      materialRatio:
        Number(s.total_cost) > 0
          ? Math.round((Number(s.total_material_cost) / Number(s.total_cost)) * 100)
          : 0,
      laborRatio:
        Number(s.total_cost) > 0
          ? Math.round((Number(s.total_labor_cost) / Number(s.total_cost)) * 100)
          : 0,
      toolRatio:
        Number(s.total_cost) > 0
          ? Math.round((Number(s.total_tool_cost) / Number(s.total_cost)) * 100)
          : 0,
    },
    monthlyTrend,
    topByCustomer,
    costBreakdown,
  });
});
