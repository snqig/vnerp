import { getTranslations } from 'next-intl/server';

;
﻿import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { toLocalDateStr } from '@/lib/date-utils';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

/**
 * 报表仪表盘 - 核心指标汇总
 */
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '30'; // 天数

  const days = parseInt(period) || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  // 修复：toISOString() 取的是 **UTC 日期**，UTC+8 每天 00:00~08:00 会算成前一天，
  // 导致「近 N 天」统计口径随机少一天。统一走本地日历日。
  const startDateStr = toLocalDateStr(startDate);

  // 五块指标互不依赖，改为并发执行（单次请求从 5 次串行 RTT 降到 1 次）。
  const [orderStats, productionStats, inventoryStats, purchaseStats, financeStats] =
    await Promise.all([
      // 1. 订单指标
      query(
        `SELECT
          COUNT(*) as total_orders,
          SUM(CASE WHEN status IN (3, 4) THEN 1 ELSE 0 END) as completed_orders,
          SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as pending_orders,
          COALESCE(SUM(total_amount), 0) as total_amount,
          COALESCE(SUM(CASE WHEN status IN (3, 4) THEN total_amount ELSE 0 END), 0) as completed_amount
        FROM sal_order
        WHERE deleted = 0 AND order_date >= ?`,
        [startDateStr]
      ),
      // 2. 生产指标
      query(
        `SELECT
          COUNT(*) as total_work_orders,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_work_orders,
          SUM(CASE WHEN status IN ('confirmed', 'producing') THEN 1 ELSE 0 END) as in_progress_work_orders,
          COALESCE(SUM(planned_qty), 0) as total_plan_qty,
          COALESCE(SUM(completed_qty), 0) as total_completed_qty
        FROM prod_work_order
        WHERE deleted = 0 AND plan_start_date >= ?`,
        [startDateStr]
      ),
      // 3. 库存指标
      query(
        `SELECT
          COUNT(DISTINCT material_id) as material_count,
          COALESCE(SUM(quantity), 0) as total_stock,
          COALESCE(SUM(locked_qty), 0) as total_locked,
          COALESCE(SUM(available_qty), 0) as total_available,
          COUNT(CASE WHEN available_qty <= 0 THEN 1 END) as zero_stock_count,
          COUNT(CASE WHEN available_qty > 0 AND available_qty <= 10 THEN 1 END) as low_stock_count
        FROM inv_inventory
        WHERE deleted = 0`
      ),
      // 4. 采购指标
      query(
        `SELECT
          COUNT(*) as total_purchase_orders,
          SUM(CASE WHEN status >= 40 THEN 1 ELSE 0 END) as received_orders,
          COALESCE(SUM(total_amount), 0) as total_purchase_amount
        FROM pur_purchase_order
        WHERE deleted = 0 AND order_date >= ?`,
        [startDateStr]
      ),
      // 5. 财务指标（应收应付）
      query(
        `SELECT
          COALESCE((SELECT SUM(amount) FROM fin_receivable WHERE deleted = 0 AND status = 1), 0) as pending_receivable,
          COALESCE((SELECT SUM(amount) FROM fin_payable WHERE deleted = 0 AND status = 1), 0) as pending_payable`
      ),
    ]);

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
    ts('k_or2c9t')
  );
});
