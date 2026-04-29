import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, withErrorHandler } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const periodType = searchParams.get('period_type') || 'month';

  let dateFormat: string;
  switch (periodType) {
    case 'day': dateFormat = '%Y-%m-%d'; break;
    case 'week': dateFormat = '%Y-W%u'; break;
    case 'quarter': dateFormat = '%Y-Q%q'; break;
    case 'year': dateFormat = '%Y'; break;
    default: dateFormat = '%Y-%m';
  }

  const revenueRows: any = await query(`
    SELECT DATE_FORMAT(create_time, '${dateFormat}') as period,
      'revenue' as type, '销售收入' as category,
      COALESCE(SUM(amount), 0) as revenue, 0 as cost,
      COALESCE(SUM(amount), 0) as profit,
      CASE WHEN SUM(amount) > 0 THEN 100 ELSE 0 END as profit_rate
    FROM fin_receivable WHERE deleted = 0 AND status IN (2, 3)
    GROUP BY period ORDER BY period DESC
  `);

  const costRows: any = await query(`
    SELECT DATE_FORMAT(cost_date, '${dateFormat}') as period,
      'cost' as type, cost_type as category,
      0 as revenue, COALESCE(SUM(amount), 0) as cost,
      -COALESCE(SUM(amount), 0) as profit,
      0 as profit_rate
    FROM fin_cost_record WHERE deleted = 0
    GROUP BY period, cost_type ORDER BY period DESC
  `);

  const allRows = [...revenueRows, ...costRows];
  const total = allRows.length;
  const start = (page - 1) * pageSize;
  const list = allRows.slice(start, start + pageSize);

  const summary: any = await query(`
    SELECT
      COALESCE((SELECT SUM(amount) FROM fin_receivable WHERE deleted = 0 AND status IN (2, 3)), 0) as total_revenue,
      COALESCE((SELECT SUM(amount) FROM fin_cost_record WHERE deleted = 0), 0) as total_cost,
      COALESCE((SELECT SUM(amount) FROM fin_receivable WHERE deleted = 0 AND status IN (2, 3)), 0)
        - COALESCE((SELECT SUM(amount) FROM fin_cost_record WHERE deleted = 0), 0) as total_profit
  `);

  const totalRevenue = parseFloat(summary[0]?.total_revenue || 0);
  const totalCost = parseFloat(summary[0]?.total_cost || 0);
  const totalProfit = totalRevenue - totalCost;
  const profitRate = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0;

  return successResponse({
    list,
    total,
    page,
    pageSize,
    total_revenue: totalRevenue,
    total_cost: totalCost,
    total_profit: totalProfit,
    profit_rate: profitRate,
  });
});
