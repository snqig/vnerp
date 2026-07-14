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

  const dailyTrend = await query(
    `SELECT
      DATE(usage_time) as date,
      COALESCE(SUM(CASE WHEN usage_type = 'consumption' THEN weight ELSE 0 END), 0) as consumed,
      COALESCE(SUM(CASE WHEN usage_type = 'return' THEN weight ELSE 0 END), 0) as returned,
      COALESCE(SUM(CASE WHEN usage_type = 'scrap' THEN weight ELSE 0 END), 0) as scraped,
      COUNT(*) as record_count
    FROM ink_usage
    WHERE deleted = 0 AND usage_time >= ?
    GROUP BY DATE(usage_time)
    ORDER BY date`,
    [startDateStr]
  );

  const topWorkOrders = await query(
    `SELECT
      u.workorder_no,
      u.color_name,
      COALESCE(SUM(CASE WHEN u.usage_type = 'consumption' THEN u.weight ELSE 0 END), 0) as consumed,
      COALESCE(SUM(CASE WHEN u.usage_type = 'return' THEN u.weight ELSE 0 END), 0) as returned,
      COUNT(*) as record_count
    FROM ink_usage u
    WHERE u.deleted = 0 AND u.usage_time >= ? AND u.workorder_no IS NOT NULL
    GROUP BY u.workorder_no, u.color_name
    ORDER BY consumed DESC
    LIMIT 10`,
    [startDateStr]
  );

  const typeSummary = await query(
    `SELECT
      o.ink_type,
      COUNT(*) as opening_count,
      COALESCE(SUM(CASE WHEN o.status = 2 THEN 1 ELSE 0 END), 0) as expired_count,
      COUNT(DISTINCT o.material_code) as material_count
    FROM ink_opening_record o
    WHERE o.deleted = 0 AND o.open_time >= ?
    GROUP BY o.ink_type`,
    [startDateStr]
  );

  const summary = await query(
    `SELECT
      COALESCE(SUM(CASE WHEN usage_type = 'consumption' THEN weight ELSE 0 END), 0) as total_consumed,
      COALESCE(SUM(CASE WHEN usage_type = 'return' THEN weight ELSE 0 END), 0) as total_returned,
      COALESCE(SUM(CASE WHEN usage_type = 'scrap' THEN weight ELSE 0 END), 0) as total_scraped,
      COUNT(DISTINCT workorder_no) as work_order_count
    FROM ink_usage WHERE deleted = 0 AND usage_time >= ?`,
    [startDateStr]
  );

  const s = (summary[0] || {}) as Loose;

  return successResponse({
    period: `${days}天`,
    summary: {
      totalConsumed: Number(s.total_consumed) || 0,
      totalReturned: Number(s.total_returned) || 0,
      totalScraped: Number(s.total_scraped) || 0,
      workOrderCount: Number(s.work_order_count) || 0,
    },
    dailyTrend,
    topWorkOrders,
    typeSummary,
  });
});
