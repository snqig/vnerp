import { query } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const GET = withPermission(async () => {
  const [salesData, inventoryData, productionData] = await Promise.all([
    query<{ revenue: number; orders: number }>(
      `SELECT COALESCE(SUM(amount), 0) as revenue, COUNT(*) as orders
       FROM sal_order WHERE MONTH(order_date) = MONTH(NOW()) AND YEAR(order_date) = YEAR(NOW()) AND deleted = 0`
    ),
    query<{ turnover_rate: number; total_value: number }>(
      `SELECT COALESCE(AVG(turnover_rate), 0) as turnover_rate,
              COALESCE(SUM(quantity * unit_cost), 0) as total_value
       FROM inv_inventory WHERE deleted = 0`
    ),
    query<{ completion_rate: number; total: number; completed: number }>(
      `SELECT COALESCE(
         (SELECT COUNT(*) FROM prd_work_order WHERE status >= 4 AND deleted = 0
          AND MONTH(plan_end_date) = MONTH(NOW())) * 100.0 /
         NULLIF((SELECT COUNT(*) FROM prd_work_order WHERE deleted = 0
          AND MONTH(plan_end_date) = MONTH(NOW())), 0), 0) as completion_rate,
       (SELECT COUNT(*) FROM prd_work_order WHERE deleted = 0
        AND MONTH(plan_end_date) = MONTH(NOW())) as total,
       (SELECT COUNT(*) FROM prd_work_order WHERE status >= 4 AND deleted = 0
        AND MONTH(plan_end_date) = MONTH(NOW())) as completed`
    ),
  ]);

  const trendData = await query<{ month: string; value: number }>(
    `SELECT DATE_FORMAT(order_date, '%Y-%m') as month, COALESCE(SUM(amount), 0) as value
     FROM sal_order WHERE order_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH) AND deleted = 0
     GROUP BY DATE_FORMAT(order_date, '%Y-%m') ORDER BY month ASC`
  );

  const alerts: Array<{ level: 'critical' | 'warning' | 'info'; message: string }> = [];

  const revenue = Number(salesData[0]?.revenue || 0);
  const turnoverRate = Number(inventoryData[0]?.turnover_rate || 0);
  const completionRate = Number(productionData[0]?.completion_rate || 0);

  if (turnoverRate < 4) {
    alerts.push({
      level: 'warning',
      message: `库存周转率 ${turnoverRate.toFixed(1)}x，低于警戒线4x，建议清理滞销品`,
    });
  }
  if (completionRate < 95) {
    alerts.push({
      level: 'critical',
      message: `订单完成率 ${completionRate.toFixed(1)}%，低于目标95%，立即处理瓶颈工序`,
    });
  }
  if (revenue < 100000) {
    alerts.push({ level: 'info', message: `本月销售收入 ¥${revenue.toLocaleString()}，低于预期` });
  }

  return successResponse({
    currentMonth: {
      revenue,
      orders: Number(salesData[0]?.orders || 0),
      fulfillmentRate: completionRate,
      turnoverRate,
      inventoryValue: Number(inventoryData[0]?.total_value || 0),
    },
    trend: trendData,
    alerts,
    production: {
      total: Number(productionData[0]?.total || 0),
      completed: Number(productionData[0]?.completed || 0),
    },
  });
});
