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

  const statusDistribution = await query(
    `SELECT die_status, COUNT(*) as count FROM prd_die_template
     WHERE deleted = 0 GROUP BY die_status ORDER BY count DESC`
  );

  const assetTypeDistribution = await query(
    `SELECT asset_type, COUNT(*) as count FROM prd_die_template
     WHERE deleted = 0 GROUP BY asset_type ORDER BY count DESC`
  );

  const lifeDistribution = await query(
    `SELECT
      CASE
        WHEN max_usage <= 0 THEN 'unknown'
        WHEN remaining_usage * 100.0 / max_usage >= 80 THEN 'safe'
        WHEN remaining_usage * 100.0 / max_usage >= 50 THEN 'normal'
        WHEN remaining_usage * 100.0 / max_usage >= 20 THEN 'warning'
        ELSE 'critical'
      END as life_level,
      COUNT(*) as count
    FROM prd_die_template WHERE deleted = 0 AND max_usage > 0
    GROUP BY life_level`
  );

  const usageTrend = await query(
    `SELECT
      DATE(usage_date) as date,
      COALESCE(SUM(impressions), 0) as total_impressions,
      COUNT(DISTINCT die_id) as active_dies
    FROM prd_die_usage_log
    WHERE usage_date >= ?
    GROUP BY DATE(usage_date)
    ORDER BY date`,
    [startDateStr]
  );

  const maintenanceStats = await query(
    `SELECT
      m.maintenance_type,
      COUNT(*) as count,
      COALESCE(SUM(m.cost), 0) as total_cost
    FROM prd_die_maintenance m
    WHERE m.deleted = 0 AND m.create_time >= ?
    GROUP BY m.maintenance_type`,
    [startDateStr]
  );

  const topUsedDies = await query(
    `SELECT
      t.template_code, t.template_name, t.asset_type, t.remaining_usage, t.max_usage,
      COALESCE(SUM(l.impressions), 0) as period_usage
    FROM prd_die_template t
    LEFT JOIN prd_die_usage_log l ON l.die_id = t.id AND l.usage_date >= ?
    WHERE t.deleted = 0
    GROUP BY t.id
    ORDER BY period_usage DESC
    LIMIT 10`,
    [startDateStr]
  );

  const warningList = await query(
    `SELECT template_code, template_name, die_status, remaining_usage, max_usage,
            warning_usage, cumulative_impressions
     FROM prd_die_template
     WHERE deleted = 0 AND remaining_usage <= warning_usage AND die_status != 'scrap'
     ORDER BY remaining_usage ASC`
  );

  return successResponse({
    period: `${days}天`,
    statusDistribution,
    assetTypeDistribution,
    lifeDistribution,
    usageTrend,
    maintenanceStats,
    topUsedDies,
    warningList,
  });
});
