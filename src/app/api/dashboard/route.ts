import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    let todayOrders = 0, orderChange = 0, pendingOrders = 0, producingOrders = 0;
    let completedToday = 0, totalCustomers = 0, todayProduction = 0, productionChange = 0;

    try {
      const rows: any = await query(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN DATE(create_time) = CURDATE() THEN 1 ELSE 0 END) as today,
          SUM(CASE WHEN burdening_status = 0 THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN burdening_status = 2 THEN 1 ELSE 0 END) as producing,
          SUM(CASE WHEN burdening_status = 3 AND DATE(update_time) = CURDATE() THEN 1 ELSE 0 END) as completed_today
        FROM prd_process_card WHERE deleted = 0
      `);
      if (Array.isArray(rows) && rows.length > 0) {
        todayOrders = Number(rows[0].today || 0);
        pendingOrders = Number(rows[0].pending || 0);
        producingOrders = Number(rows[0].producing || 0);
        completedToday = Number(rows[0].completed_today || 0);
      }
    } catch (e) { console.error('orderStats failed:', e); }

    try {
      const rows: any = await query(`SELECT COUNT(*) as total FROM crm_customer WHERE deleted = 0`);
      if (Array.isArray(rows) && rows.length > 0) totalCustomers = Number(rows[0].total || 0);
    } catch (e) { console.error('customerStats failed:', e); }

    let inventoryAlert = 0;
    try {
      const rows: any = await query(`
        SELECT COUNT(*) as total FROM inv_material WHERE deleted = 0 AND status = 1 AND stock_qty <= min_stock
      `);
      if (Array.isArray(rows) && rows.length > 0) inventoryAlert = Number(rows[0].total || 0);
    } catch (e) { console.error('inventoryAlert failed:', e); }

    let totalEmployees = 0;
    try {
      const rows: any = await query(`SELECT COUNT(*) as total FROM sys_user WHERE deleted = 0 AND status = 1`);
      if (Array.isArray(rows) && rows.length > 0) totalEmployees = Number(rows[0].total || 0);
    } catch (e) { console.error('employeeStats failed:', e); }

    let recentOrders: any[] = [];
    try {
      const rows: any = await query(`
        SELECT pc.id, pc.card_no, pc.work_order_no, pc.product_name, pc.plan_qty,
          pc.burdening_status, pc.work_order_date, pc.update_time, sc.customer_name
        FROM prd_process_card pc
        LEFT JOIN prd_standard_card sc ON pc.product_code = sc.id
        WHERE pc.deleted = 0 ORDER BY pc.update_time DESC LIMIT 8
      `);
      recentOrders = Array.isArray(rows) ? rows : [];
    } catch (e) { console.error('recentOrders failed:', e); }

    let alerts: any[] = [];
    try {
      const inkRows: any = await query(`
        SELECT COUNT(*) as total FROM dcprint_ink_opening WHERE deleted = 0 AND status = 1 AND DATEDIFF(expire_time, NOW()) <= 1
      `);
      const inkAlert = Array.isArray(inkRows) && inkRows.length > 0 ? Number(inkRows[0].total || 0) : 0;
      if (inkAlert > 0) alerts.push({ type: 'quality', message: `${inkAlert}罐油墨即将过期`, severity: 'high', time: '刚刚' });

      const dieRows: any = await query(`
        SELECT COUNT(*) as total FROM prepress_die_template WHERE deleted = 0 AND status = 1 AND usage_percent >= 80
      `);
      const dieAlert = Array.isArray(dieRows) && dieRows.length > 0 ? Number(dieRows[0].total || 0) : 0;
      if (dieAlert > 0) alerts.push({ type: 'production', message: `${dieAlert}个刀模/网版使用率超80%`, severity: 'medium', time: '刚刚' });

      if (inventoryAlert > 0) alerts.push({ type: 'inventory', message: `${inventoryAlert}种物料库存不足`, severity: 'high', time: '刚刚' });
    } catch (e) { console.error('alerts failed:', e); }

    let orderStats: any[] = [];
    try {
      const rows: any = await query(`
        SELECT DATE(create_time) as date, COUNT(*) as count
        FROM sal_order WHERE deleted = 0 AND create_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY DATE(create_time) ORDER BY date
      `);
      orderStats = Array.isArray(rows) ? rows : [];
    } catch (e) { console.error('orderStatsChart failed:', e); }

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          todayOrders,
          orderChange,
          pendingOrders,
          producingOrders,
          completedToday,
          inventoryAlert,
          totalCustomers,
          totalEmployees,
          todayProduction,
          productionChange,
        },
        recentOrders: recentOrders.map((o: any) => ({
          id: o.id,
          orderNo: o.work_order_no || o.card_no,
          customer: o.customer_name || '-',
          product: o.product_name || '-',
          quantity: Number(o.plan_qty || 0),
          status: o.burdening_status,
          date: o.work_order_date,
        })),
        alerts,
        orderStats,
      },
    });
  } catch (error) {
    console.error('获取仪表盘数据失败:', error);
    return NextResponse.json({ success: false, message: '获取仪表盘数据失败' }, { status: 500 });
  }
}
