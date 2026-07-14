import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

/**
 * T404: 采购供货统计 - 按供应商分组聚合采购金额与订单数量
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
       COALESCE(NULLIF(po.supplier_id, 0), 0) AS supplier_id,
       po.supplier_name,
       MAX(po.supplier_code) AS supplier_code,
       COUNT(*) AS order_count,
       COALESCE(SUM(po.total_amount), 0) AS total_amount,
       COALESCE(SUM(po.total_quantity), 0) AS total_quantity,
       SUM(CASE WHEN po.status >= 30 THEN 1 ELSE 0 END) AS received_count
     FROM pur_purchase_order po
     WHERE po.deleted = 0
       AND po.order_date >= ?
       AND po.supplier_name IS NOT NULL
     GROUP BY po.supplier_id, po.supplier_name
     ORDER BY total_amount DESC
     LIMIT ?`,
    [startDateStr, limit]
  );

  const totalAmount = rows.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);
  const totalCount = rows.reduce((sum, r) => sum + (Number(r.order_count) || 0), 0);

  const list = rows.map((r, idx) => ({
    rank: idx + 1,
    supplierId: r.supplier_id,
    supplierName: r.supplier_name,
    supplierCode: r.supplier_code || '',
    orderCount: Number(r.order_count) || 0,
    receivedCount: Number(r.received_count) || 0,
    totalAmount: parseFloat(r.total_amount) || 0,
    totalQuantity: parseFloat(r.total_quantity) || 0,
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
      supplierCount: list.length,
    },
  });
});
