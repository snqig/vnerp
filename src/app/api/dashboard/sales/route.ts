import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getConfig } from '@/lib/global-config';
import { logger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    const dashboardDays = Number(getConfig('dashboard_trend_days') || 30);

    const overview: Loose = {
      totalOrders: 0,
      todayOrders: 0,
      monthRevenue: 0,
      pendingDelivery: 0,
      completedOrders: 0,
      orderChange: 0,
    };
    try {
      const rows: Loose = await query(`
        SELECT COUNT(*) as total,
          SUM(CASE WHEN DATE(create_time) = CURDATE() THEN 1 ELSE 0 END) as today,
          SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as completed
        FROM sal_order WHERE deleted = 0
      `);
      if (Array.isArray(rows) && rows.length > 0) {
        overview.totalOrders = Number(rows[0].total || 0);
        overview.todayOrders = Number(rows[0].today || 0);
        overview.pendingDelivery = Number(rows[0].pending || 0);
        overview.completedOrders = Number(rows[0].completed || 0);
      }
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'sales' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    try {
      const rows: Loose = await query(`
        SELECT COALESCE(SUM(total_amount), 0) as total FROM sal_order
        WHERE deleted = 0 AND DATE(create_time) >= DATE_SUB(CURDATE(), INTERVAL ${dashboardDays} DAY)
      `);
      if (Array.isArray(rows) && rows.length > 0)
        overview.monthRevenue = Number(rows[0].total || 0);
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'sales' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    let orderTrend: Loose[] = [];
    try {
      const rows: Loose = await query(`
        SELECT DATE(create_time) as date, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount
        FROM sal_order WHERE deleted = 0 AND create_time >= DATE_SUB(CURDATE(), INTERVAL ${dashboardDays} DAY)
        GROUP BY DATE(create_time) ORDER BY date
      `);
      orderTrend = Array.isArray(rows) ? rows : [];
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'sales' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    let topCustomers: Loose[] = [];
    try {
      const rows: Loose = await query(`
        SELECT c.customer_name, COUNT(*) as order_count, COALESCE(SUM(o.total_amount), 0) as total_amount
        FROM sal_order o
        LEFT JOIN crm_customer c ON o.customer_id = c.id
        WHERE o.deleted = 0 GROUP BY c.customer_name ORDER BY total_amount DESC LIMIT 5
      `);
      topCustomers = Array.isArray(rows) ? rows : [];
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'sales' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    let topProducts: Loose[] = [];
    try {
      const rows: Loose = await query(`
        SELECT product_name, SUM(quantity) as total_qty, COALESCE(SUM(amount), 0) as total_amount
        FROM sal_order_item WHERE deleted = 0 GROUP BY product_name ORDER BY total_amount DESC LIMIT 5
      `);
      topProducts = Array.isArray(rows) ? rows : [];
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'sales' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    let recentOrders: Loose[] = [];
    try {
      const rows: Loose = await query(`
        SELECT o.id, o.order_no, c.customer_name, o.total_amount, o.status, o.delivery_date, o.create_time
        FROM sal_order o
        LEFT JOIN crm_customer c ON o.customer_id = c.id
        WHERE o.deleted = 0 ORDER BY o.create_time DESC LIMIT 10
      `);
      recentOrders = Array.isArray(rows) ? rows : [];
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'sales' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    let statusDistribution: Loose[] = [];
    try {
      const rows: Loose = await query(`
        SELECT status, COUNT(*) as count FROM sal_order WHERE deleted = 0 GROUP BY status
      `);
      statusDistribution = Array.isArray(rows) ? rows : [];
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'sales' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    return NextResponse.json({
      success: true,
      data: { overview, orderTrend, topCustomers, topProducts, recentOrders, statusDistribution },
    });
  } catch {
    return NextResponse.json({ success: false, message: '获取销售看板数据失败' }, { status: 500 });
  }
}
