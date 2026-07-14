import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

/**
 * T404: 销售业绩统计 - 按客户分组聚合销售金额与订单数量
 */
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '30';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

  const days = parseInt(period);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  const rows: Loose[] = await query(
    `SELECT
       so.customer_id,
       c.customer_name,
       c.customer_code,
       COUNT(*) AS order_count,
       COALESCE(SUM(so.total_amount), 0) AS total_amount,
       COALESCE(SUM(so.total_with_tax), 0) AS total_with_tax,
       SUM(CASE WHEN so.status >= 3 THEN 1 ELSE 0 END) AS completed_count
     FROM sal_order so
     LEFT JOIN crm_customer c ON so.customer_id = c.id
     WHERE so.deleted = 0
       AND so.order_date >= ?
     GROUP BY so.customer_id, c.customer_name, c.customer_code
     ORDER BY total_amount DESC
     LIMIT ?`,
    [startDateStr, limit]
  );

  const totalAmount = rows.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);
  const totalCount = rows.reduce((sum, r) => sum + (Number(r.order_count) || 0), 0);

  const list = rows.map((r, idx) => ({
    rank: idx + 1,
    customerId: r.customer_id,
    customerName: r.customer_name || '',
    customerCode: r.customer_code || '',
    orderCount: Number(r.order_count) || 0,
    completedCount: Number(r.completed_count) || 0,
    totalAmount: parseFloat(r.total_amount) || 0,
    totalWithTax: parseFloat(r.total_with_tax) || 0,
    proportion:
      totalAmount > 0
        ? Math.round(((parseFloat(r.total_amount) || 0) / totalAmount) * 1000) / 10
        : 0,
  }));

  return successResponse({
    period: `${days}`,
    list,
    summary: {
      totalAmount,
      totalCount,
      customerCount: list.length,
    },
  });
});
