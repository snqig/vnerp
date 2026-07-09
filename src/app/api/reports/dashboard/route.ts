import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

/**
 * 报表仪表盘 - 核心指标汇总
 */
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '30'; // 天数

  const days = parseInt(period);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  // 1. 订单指标
  const orderStats: Loose = await query(
    `SELECT
      COUNT(*) as total_orders,
      SUM(CASE WHEN status >= 3 THEN 1 ELSE 0 END) as completed_orders,
      SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as pending_orders,
      COALESCE(SUM(total_amount), 0) as total_amount,
      COALESCE(SUM(CASE WHEN status >= 3 THEN total_amount ELSE 0 END), 0) as completed_amount
    FROM sales_order
    WHERE deleted = 0 AND order_date >= ?`,
    [startDateStr]
  );

  // 2. 生产指标
  const productionStats: Loose = await query(
    `SELECT
      COUNT(*) as total_work_orders,
      SUM(CASE WHEN status >= 3 THEN 1 ELSE 0 END) as completed_work_orders,
      SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as in_progress_work_orders,
      COALESCE(SUM(plan_qty), 0) as total_plan_qty,
      COALESCE(SUM(completed_qty), 0) as total_completed_qty
    FROM prd_work_order
    WHERE deleted = 0 AND work_order_date >= ?`,
    [startDateStr]
  );

  // 3. 库存指标
  const inventoryStats: Loose = await query(
    `SELECT
      COUNT(DISTINCT material_id) as material_count,
      COALESCE(SUM(quantity), 0) as total_stock,
      COALESCE(SUM(locked_qty), 0) as total_locked,
      COALESCE(SUM(available_qty), 0) as total_available,
      COUNT(CASE WHEN available_qty <= 0 THEN 1 END) as zero_stock_count,
      COUNT(CASE WHEN available_qty > 0 AND available_qty <= 10 THEN 1 END) as low_stock_count
    FROM inv_inventory
    WHERE deleted = 0`
  );

  // 4. 采购指标
  const purchaseStats: Loose = await query(
    `SELECT
      COUNT(*) as total_purchase_orders,
      SUM(CASE WHEN status >= 3 THEN 1 ELSE 0 END) as received_orders,
      COALESCE(SUM(total_amount), 0) as total_purchase_amount
    FROM purchase_order
    WHERE deleted = 0 AND order_date >= ?`,
    [startDateStr]
  );

  // 5. 财务指标（应收应付）
  const financeStats: Loose = await query(
    `SELECT
      COALESCE(SUM(CASE WHEN type = 'receivable' AND status = 1 THEN amount ELSE 0 END), 0) as pending_receivable,
      COALESCE(SUM(CASE WHEN type = 'payable' AND status = 1 THEN amount ELSE 0 END), 0) as pending_payable
    FROM finance_flow
    WHERE deleted = 0`
  );

  const orderRow = orderStats[0] || {};
  const productionRow = productionStats[0] || {};
  const inventoryRow = inventoryStats[0] || {};
  const purchaseRow = purchaseStats[0] || {};
  const financeRow = financeStats[0] || {};

  return successResponse(
    {
      period: `${days}天`,
      orderMetrics: {
        totalOrders: orderRow.total_orders || 0,
        completedOrders: orderRow.completed_orders || 0,
        pendingOrders: orderRow.pending_orders || 0,
        totalAmount: parseFloat(orderRow.total_amount) || 0,
        completedAmount: parseFloat(orderRow.completed_amount) || 0,
        completionRate:
          orderRow.total_orders > 0
            ? Math.round((orderRow.completed_orders / orderRow.total_orders) * 100)
            : 0,
      },
      productionMetrics: {
        totalWorkOrders: productionRow.total_work_orders || 0,
        completedWorkOrders: productionRow.completed_work_orders || 0,
        inProgressWorkOrders: productionRow.in_progress_work_orders || 0,
        totalPlanQty: parseFloat(productionRow.total_plan_qty) || 0,
        totalCompletedQty: parseFloat(productionRow.total_completed_qty) || 0,
        completionRate:
          productionRow.total_plan_qty > 0
            ? Math.round((productionRow.total_completed_qty / productionRow.total_plan_qty) * 100)
            : 0,
      },
      inventoryMetrics: {
        materialCount: inventoryRow.material_count || 0,
        totalStock: parseFloat(inventoryRow.total_stock) || 0,
        totalLocked: parseFloat(inventoryRow.total_locked) || 0,
        totalAvailable: parseFloat(inventoryRow.total_available) || 0,
        zeroStockCount: inventoryRow.zero_stock_count || 0,
        lowStockCount: inventoryRow.low_stock_count || 0,
      },
      purchaseMetrics: {
        totalPurchaseOrders: purchaseRow.total_purchase_orders || 0,
        receivedOrders: purchaseRow.received_orders || 0,
        totalPurchaseAmount: parseFloat(purchaseRow.total_purchase_amount) || 0,
      },
      financeMetrics: {
        pendingReceivable: parseFloat(financeRow.pending_receivable) || 0,
        pendingPayable: parseFloat(financeRow.pending_payable) || 0,
      },
    },
    '获取仪表盘数据成功'
  );
});
