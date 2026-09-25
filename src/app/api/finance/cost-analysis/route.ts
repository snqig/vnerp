import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year') || new Date().getFullYear().toString();

  const trendRows = await query(`
    SELECT
      DATE_FORMAT(cost_date, '%Y-%m') as month,
      COALESCE(SUM(CASE WHEN cost_type = 'material' THEN amount ELSE 0 END), 0) as material,
      COALESCE(SUM(CASE WHEN cost_type = 'labor' THEN amount ELSE 0 END), 0) as labor,
      COALESCE(SUM(CASE WHEN cost_type = 'overhead' THEN amount ELSE 0 END), 0) as manufacturing,
      COALESCE(SUM(CASE WHEN cost_type = 'outsource' THEN amount ELSE 0 END), 0) as outsource,
      COALESCE(SUM(amount), 0) as total
    FROM fin_cost_record
    WHERE deleted = 0 AND cost_date LIKE ?
    GROUP BY DATE_FORMAT(cost_date, '%Y-%m')
    ORDER BY month ASC
  `, [`${year}%`]);

  const lastYearRows = await query(`
    SELECT
      DATE_FORMAT(cost_date, '%Y-%m') as month,
      COALESCE(SUM(CASE WHEN cost_type = 'material' THEN amount ELSE 0 END), 0) as material,
      COALESCE(SUM(CASE WHEN cost_type = 'labor' THEN amount ELSE 0 END), 0) as labor,
      COALESCE(SUM(CASE WHEN cost_type = 'overhead' THEN amount ELSE 0 END), 0) as manufacturing,
      COALESCE(SUM(CASE WHEN cost_type = 'outsource' THEN amount ELSE 0 END), 0) as outsource,
      COALESCE(SUM(amount), 0) as total
    FROM fin_cost_record
    WHERE deleted = 0 AND cost_date LIKE ?
    GROUP BY DATE_FORMAT(cost_date, '%Y-%m')
    ORDER BY month ASC
  `, [(parseInt(year) - 1) + '%']);

  const summaryRow = await query(`
    SELECT
      COALESCE(SUM(CASE WHEN cost_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN amount ELSE 0 END), 0) as thisMonth,
      COALESCE(SUM(CASE WHEN cost_date >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01') AND cost_date < DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN amount ELSE 0 END), 0) as lastMonth
    FROM fin_cost_record
    WHERE deleted = 0
  `);

  const budgetRow = await query(`
    SELECT COALESCE(value, 0) as budget
    FROM sys_config
    WHERE config_key = 'finance.budget_monthly'
    LIMIT 1
  `);
  const budget = parseFloat(budgetRow[0]?.budget || 0);

  const thisMonthCost = parseFloat(summaryRow[0]?.thisMonth || 0);
  const lastMonthCost = parseFloat(summaryRow[0]?.lastMonth || 0);
  const change = lastMonthCost > 0 ? ((thisMonthCost - lastMonthCost) / lastMonthCost) * 100 : 0;
  const budgetExecRate = budget > 0 ? (thisMonthCost / budget) * 100 : 0;

  const trend = trendRows.map((r) => ({
    month: r.month,
    total: parseFloat(r.total || 0),
    material: parseFloat(r.material || 0),
    labor: parseFloat(r.labor || 0),
    manufacturing: parseFloat(r.manufacturing || 0),
    outsource: parseFloat(r.outsource || 0),
  }));

  const lastYearTrend = lastYearRows.map((r) => ({
    month: r.month,
    total: parseFloat(r.total || 0),
  }));

  return successResponse({
    trend,
    lastYearTrend,
    stats: {
      thisMonth: thisMonthCost,
      lastMonth: lastMonthCost,
      change: parseFloat(change.toFixed(2)),
      budgetExecRate: parseFloat(budgetExecRate.toFixed(2)),
    },
  });
});
