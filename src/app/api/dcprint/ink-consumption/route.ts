import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, withErrorHandler } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const workorderNo = searchParams.get('workorderNo') || '';
  const period = searchParams.get('period') || 'month';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  let dateFilter = '';
  const params: any[] = [];

  if (workorderNo) {
    dateFilter = 'AND u.workorder_no = ?';
    params.push(workorderNo);
  } else if (startDate && endDate) {
    dateFilter = 'AND u.usage_time BETWEEN ? AND ?';
    params.push(startDate, endDate);
  } else if (period === 'week') {
    dateFilter = 'AND u.usage_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
  } else if (period === 'month') {
    dateFilter = 'AND u.usage_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
  } else if (period === 'quarter') {
    dateFilter = 'AND u.usage_time >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)';
  }

  let workorderAnalysis: any[] = [];
  try {
    workorderAnalysis = await query(`
      SELECT
        u.workorder_no,
        d.color_name,
        d.pantone_code,
        d.total_weight as formula_weight,
        d.net_weight as actual_dispatch_weight,
        COALESCE(SUM(CASE WHEN u.usage_type = 'consumption' THEN u.weight ELSE 0 END), 0) as total_consumed,
        COALESCE(SUM(CASE WHEN u.usage_type = 'return' THEN u.weight ELSE 0 END), 0) as total_returned,
        COALESCE(SUM(CASE WHEN u.usage_type = 'scrap' THEN u.weight ELSE 0 END), 0) as total_scraped,
        d.total_weight - COALESCE(SUM(CASE WHEN u.usage_type = 'consumption' THEN u.weight ELSE 0 END), 0) as waste_amount,
        CASE WHEN d.total_weight > 0
          THEN ROUND((d.total_weight - COALESCE(SUM(CASE WHEN u.usage_type = 'consumption' THEN u.weight ELSE 0 END), 0)) / d.total_weight * 100, 2)
          ELSE 0 END as waste_rate,
        COUNT(DISTINCT u.id) as usage_count
      FROM ink_dispatch d
      LEFT JOIN ink_usage u ON u.batch_no = d.batch_no AND u.deleted = 0 ${dateFilter.replace('u.', 'u.')}
      WHERE d.deleted = 0 AND d.workorder_no IS NOT NULL
      GROUP BY d.batch_no, d.workorder_no, d.color_name, d.pantone_code, d.total_weight, d.net_weight
      ORDER BY waste_rate DESC
    `, params);
  } catch (e) { console.error('Workorder analysis failed:', e); }

  let inkTypeSummary: any[] = [];
  try {
    inkTypeSummary = await query(`
      SELECT
        f.ink_type,
        COUNT(DISTINCT d.id) as dispatch_count,
        SUM(d.total_weight) as total_formula_weight,
        SUM(d.net_weight) as total_actual_weight,
        COALESCE(SUM(CASE WHEN u.usage_type = 'consumption' THEN u.weight ELSE 0 END), 0) as total_consumed,
        COALESCE(SUM(CASE WHEN u.usage_type = 'return' THEN u.weight ELSE 0 END), 0) as total_returned,
        COALESCE(SUM(CASE WHEN u.usage_type = 'scrap' THEN u.weight ELSE 0 END), 0) as total_scraped
      FROM ink_dispatch d
      LEFT JOIN ink_formula f ON d.formula_id = f.id
      LEFT JOIN ink_usage u ON u.batch_no = d.batch_no AND u.deleted = 0 ${dateFilter.replace('u.', 'u.')}
      WHERE d.deleted = 0
      GROUP BY f.ink_type
    `, params);
  } catch (e) { console.error('Ink type summary failed:', e); }

  let topWasteItems: any[] = [];
  try {
    topWasteItems = await query(`
      SELECT
        di.ink_name,
        di.brand,
        SUM(di.formula_weight) as total_formula,
        SUM(di.actual_weight) as total_actual,
        SUM(di.actual_weight) - SUM(di.formula_weight) as overage,
        CASE WHEN SUM(di.formula_weight) > 0
          THEN ROUND((SUM(di.actual_weight) - SUM(di.formula_weight)) / SUM(di.formula_weight) * 100, 2)
          ELSE 0 END as overage_rate
      FROM ink_dispatch_item di
      INNER JOIN ink_dispatch d ON di.dispatch_id = d.id
      WHERE di.deleted = 0 AND d.deleted = 0 ${dateFilter.replace('u.', 'd.')}
      GROUP BY di.ink_name, di.brand
      HAVING overage > 0
      ORDER BY overage DESC
      LIMIT 10
    `, params);
  } catch (e) { console.error('Top waste items failed:', e); }

  let dailyTrend: any[] = [];
  try {
    dailyTrend = await query(`
      SELECT
        DATE(u.usage_time) as date,
        SUM(CASE WHEN u.usage_type = 'consumption' THEN u.weight ELSE 0 END) as consumed,
        SUM(CASE WHEN u.usage_type = 'return' THEN u.weight ELSE 0 END) as returned,
        SUM(CASE WHEN u.usage_type = 'scrap' THEN u.weight ELSE 0 END) as scraped,
        COUNT(*) as usage_count
      FROM ink_usage u
      WHERE u.deleted = 0 ${dateFilter}
      GROUP BY DATE(u.usage_time)
      ORDER BY date
    `, params);
  } catch (e) { console.error('Daily trend failed:', e); }

  let summary: any = {
    total_dispatch: 0,
    total_consumed: 0,
    total_returned: 0,
    total_scraped: 0,
    overall_waste_rate: 0,
    avg_per_workorder: 0,
  };
  try {
    const summaryRows: any = await query(`
      SELECT
        COALESCE(SUM(d.total_weight), 0) as total_dispatch,
        COALESCE(SUM(CASE WHEN u.usage_type = 'consumption' THEN u.weight ELSE 0 END), 0) as total_consumed,
        COALESCE(SUM(CASE WHEN u.usage_type = 'return' THEN u.weight ELSE 0 END), 0) as total_returned,
        COALESCE(SUM(CASE WHEN u.usage_type = 'scrap' THEN u.weight ELSE 0 END), 0) as total_scraped,
        COUNT(DISTINCT d.id) as dispatch_count
      FROM ink_dispatch d
      LEFT JOIN ink_usage u ON u.batch_no = d.batch_no AND u.deleted = 0 ${dateFilter.replace('u.', 'u.')}
      WHERE d.deleted = 0
    `, params);

    if (summaryRows.length > 0) {
      const s = summaryRows[0];
      summary.total_dispatch = Number(s.total_dispatch || 0);
      summary.total_consumed = Number(s.total_consumed || 0);
      summary.total_returned = Number(s.total_returned || 0);
      summary.total_scraped = Number(s.total_scraped || 0);
      summary.overall_waste_rate = summary.total_dispatch > 0
        ? Math.round((summary.total_dispatch - summary.total_consumed) / summary.total_dispatch * 10000) / 100
        : 0;
      summary.avg_per_workorder = Number(s.dispatch_count || 0) > 0
        ? Math.round(summary.total_consumed / Number(s.dispatch_count) * 100) / 100
        : 0;
    }
  } catch (e) { console.error('Summary calc failed:', e); }

  return successResponse({
    summary,
    workorderAnalysis,
    inkTypeSummary,
    topWasteItems,
    dailyTrend,
    period,
  });
});
