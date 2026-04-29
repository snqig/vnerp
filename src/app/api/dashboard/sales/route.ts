import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    let overview: any = { totalOrders: 0, todayOrders: 0, monthRevenue: 0, pendingDelivery: 0, completedOrders: 0, orderChange: 0 };
    try {
      const rows: any = await query(`
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
    } catch (e) { console.error('sales overview failed:', e); }

    try {
      const rows: any = await query(`
        SELECT COALESCE(SUM(total_amount), 0) as total FROM sal_order
        WHERE deleted = 0 AND DATE(create_time) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      `);
      if (Array.isArray(rows) && rows.length > 0) overview.monthRevenue = Number(rows[0].total || 0);
    } catch (e) { console.error('sales revenue failed:', e); }

    let orderTrend: any[] = [];
    try {
      const rows: any = await query(`
        SELECT DATE(create_time) as date, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount
        FROM sal_order WHERE deleted = 0 AND create_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(create_time) ORDER BY date
      `);
      orderTrend = Array.isArray(rows) ? rows : [];
    } catch (e) { console.error('sales orderTrend failed:', e); }

    let topCustomers: any[] = [];
    try {
      const rows: any = await query(`
        SELECT customer_name, COUNT(*) as order_count, COALESCE(SUM(total_amount), 0) as total_amount
        FROM sal_order WHERE deleted = 0 GROUP BY customer_name ORDER BY total_amount DESC LIMIT 5
      `);
      topCustomers = Array.isArray(rows) ? rows : [];
    } catch (e) { console.error('sales topCustomers failed:', e); }

    let topProducts: any[] = [];
    try {
      const rows: any = await query(`
        SELECT product_name, SUM(quantity) as total_qty, COALESCE(SUM(amount), 0) as total_amount
        FROM sal_order_item WHERE deleted = 0 GROUP BY product_name ORDER BY total_amount DESC LIMIT 5
      `);
      topProducts = Array.isArray(rows) ? rows : [];
    } catch (e) { console.error('sales topProducts failed:', e); }

    let recentOrders: any[] = [];
    try {
      const rows: any = await query(`
        SELECT id, order_no, customer_name, total_amount, status, delivery_date, create_time
        FROM sal_order WHERE deleted = 0 ORDER BY create_time DESC LIMIT 10
      `);
      recentOrders = Array.isArray(rows) ? rows : [];
    } catch (e) { console.error('sales recentOrders failed:', e); }

    let statusDistribution: any[] = [];
    try {
      const rows: any = await query(`
        SELECT status, COUNT(*) as count FROM sal_order WHERE deleted = 0 GROUP BY status
      `);
      statusDistribution = Array.isArray(rows) ? rows : [];
    } catch (e) { console.error('sales statusDistribution failed:', e); }

    return NextResponse.json({
      success: true,
      data: { overview, orderTrend, topCustomers, topProducts, recentOrders, statusDistribution },
    });
  } catch (error) {
    console.error('获取销售看板数据失败:', error);
    return NextResponse.json({ success: false, message: '获取销售看板数据失败' }, { status: 500 });
  }
}
