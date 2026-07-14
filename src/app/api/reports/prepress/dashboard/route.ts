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

  const [dieStats] = await query(
    `SELECT
      COUNT(*) as total_templates,
      SUM(CASE WHEN die_status = 'available' THEN 1 ELSE 0 END) as available_count,
      SUM(CASE WHEN die_status = 'in_use' THEN 1 ELSE 0 END) as in_use_count,
      SUM(CASE WHEN die_status = 'maintenance_needed' THEN 1 ELSE 0 END) as maintenance_count,
      SUM(CASE WHEN die_status = 're_rule_needed' THEN 1 ELSE 0 END) as re_rule_count,
      SUM(CASE WHEN die_status = 'scrap' THEN 1 ELSE 0 END) as scrap_count,
      SUM(CASE WHEN remaining_usage <= warning_usage AND die_status != 'scrap' THEN 1 ELSE 0 END) as warning_count,
      COALESCE(SUM(remaining_usage), 0) as total_remaining,
      COALESCE(SUM(max_usage), 0) as total_max_usage
    FROM prd_die_template WHERE deleted = 0`
  );

  const [inkStats] = await query(
    `SELECT
      COALESCE(SUM(CASE WHEN usage_type = 'consumption' THEN weight ELSE 0 END), 0) as total_consumed,
      COALESCE(SUM(CASE WHEN usage_type = 'return' THEN weight ELSE 0 END), 0) as total_returned,
      COALESCE(SUM(CASE WHEN usage_type = 'scrap' THEN weight ELSE 0 END), 0) as total_scraped,
      COUNT(DISTINCT workorder_no) as affected_work_orders,
      COUNT(*) as total_records
    FROM ink_usage WHERE deleted = 0 AND usage_date >= ?`,
    [startDateStr]
  );

  const [openingStats] = await query(
    `SELECT
      COUNT(*) as total_openings,
      SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as using_count,
      SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as expired_count,
      SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as scrapped_count,
      SUM(CASE WHEN status = 1 AND expire_time < NOW() THEN 1 ELSE 0 END) as overdue_using_count
    FROM ink_opening_record WHERE deleted = 0 AND open_time >= ?`,
    [startDateStr]
  );

  const [toolStats] = await query(
    `SELECT
      COUNT(*) as total_tools,
      SUM(CASE WHEN tool_type = 1 THEN 1 ELSE 0 END) as die_count,
      SUM(CASE WHEN tool_type = 2 THEN 1 ELSE 0 END) as screen_plate_count,
      SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as in_use_count,
      SUM(CASE WHEN status = 4 THEN 1 ELSE 0 END) as warning_count,
      SUM(CASE WHEN status = 5 THEN 1 ELSE 0 END) as scrap_count,
      COALESCE(SUM(net_value), 0) as total_net_value
    FROM dcprint_tool WHERE deleted = 0`
  );

  const [sampleStats] = await query(
    `SELECT
      COUNT(*) as total_samples,
      SUM(CASE WHEN status IN (4,5) THEN 1 ELSE 0 END) as completed_count,
      SUM(CASE WHEN status = 6 THEN 1 ELSE 0 END) as cancelled_count,
      COALESCE(SUM(total_cost), 0) as total_cost,
      COALESCE(SUM(total_material_cost), 0) as total_material_cost,
      COALESCE(SUM(total_labor_cost), 0) as total_labor_cost,
      COALESCE(SUM(total_tool_cost), 0) as total_tool_cost
    FROM dcprint_sample_process_card WHERE deleted = 0 AND create_time >= ?`,
    [startDateStr]
  );

  const ds = (dieStats || {}) as Loose;
  const is = (inkStats || {}) as Loose;
  const os = (openingStats || {}) as Loose;
  const ts = (toolStats || {}) as Loose;
  const ss = (sampleStats || {}) as Loose;

  return successResponse({
    period: `${days}天`,
    dieMetrics: {
      totalTemplates: Number(ds.total_templates) || 0,
      availableCount: Number(ds.available_count) || 0,
      inUseCount: Number(ds.in_use_count) || 0,
      maintenanceCount: Number(ds.maintenance_count) || 0,
      reRuleCount: Number(ds.re_rule_count) || 0,
      scrapCount: Number(ds.scrap_count) || 0,
      warningCount: Number(ds.warning_count) || 0,
      totalRemaining: Number(ds.total_remaining) || 0,
      totalMaxUsage: Number(ds.total_max_usage) || 0,
      usageRate:
        Number(ds.total_max_usage) > 0
          ? Math.round((1 - Number(ds.total_remaining) / Number(ds.total_max_usage)) * 100)
          : 0,
    },
    inkMetrics: {
      totalConsumed: Number(is.total_consumed) || 0,
      totalReturned: Number(is.total_returned) || 0,
      totalScraped: Number(is.total_scraped) || 0,
      affectedWorkOrders: Number(is.affected_work_orders) || 0,
      totalRecords: Number(is.total_records) || 0,
    },
    openingMetrics: {
      totalOpenings: Number(os.total_openings) || 0,
      usingCount: Number(os.using_count) || 0,
      expiredCount: Number(os.expired_count) || 0,
      scrappedCount: Number(os.scrapped_count) || 0,
      overdueUsingCount: Number(os.overdue_using_count) || 0,
      expiryRate:
        Number(os.total_openings) > 0
          ? Math.round((Number(os.expired_count) / Number(os.total_openings)) * 100)
          : 0,
    },
    toolMetrics: {
      totalTools: Number(ts.total_tools) || 0,
      dieCount: Number(ts.die_count) || 0,
      screenPlateCount: Number(ts.screen_plate_count) || 0,
      pendingCount: Number(ts.pending_count) || 0,
      inUseCount: Number(ts.in_use_count) || 0,
      warningCount: Number(ts.warning_count) || 0,
      scrapCount: Number(ts.scrap_count) || 0,
      totalNetValue: Number(ts.total_net_value) || 0,
    },
    sampleMetrics: {
      totalSamples: Number(ss.total_samples) || 0,
      completedCount: Number(ss.completed_count) || 0,
      cancelledCount: Number(ss.cancelled_count) || 0,
      totalCost: Number(ss.total_cost) || 0,
      totalMaterialCost: Number(ss.total_material_cost) || 0,
      totalLaborCost: Number(ss.total_labor_cost) || 0,
      totalToolCost: Number(ss.total_tool_cost) || 0,
    },
  });
});
