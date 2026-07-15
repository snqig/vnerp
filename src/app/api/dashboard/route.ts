import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';
import { logger } from '@/lib/logger';

export const GET = withPermission(async (_request: NextRequest, _userInfo) => {
  try {
    let todayOrders = 0,
      pendingOrders = 0,
      producingOrders = 0;
    const orderChange = 0;
    let completedToday = 0,
      totalCustomers = 0;
    const todayProduction = 0,
      productionChange = 0;

    try {
      const rows: Loose = await query(`
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
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'overview' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    try {
      const rows: Loose = await query(
        `SELECT COUNT(*) as total FROM crm_customer WHERE deleted = 0`
      );
      if (Array.isArray(rows) && rows.length > 0) totalCustomers = Number(rows[0].total || 0);
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'overview' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    let inventoryAlert = 0;
    try {
      const rows: Loose = await query(`
        SELECT COUNT(*) as total FROM inv_inventory i
        JOIN inv_material m ON i.material_id = m.id
        WHERE i.deleted = 0 AND m.status = 1 AND i.quantity <= COALESCE(m.safety_stock, 0)
      `);
      if (Array.isArray(rows) && rows.length > 0) inventoryAlert = Number(rows[0].total || 0);
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'overview' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    let totalEmployees = 0;
    try {
      const rows: Loose = await query(
        `SELECT COUNT(*) as total FROM sys_user WHERE deleted = 0 AND status = 1`
      );
      if (Array.isArray(rows) && rows.length > 0) totalEmployees = Number(rows[0].total || 0);
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'overview' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    let recentOrders: Loose[] = [];
    try {
      const rows: Loose = await query(`
        SELECT pc.id, pc.card_no, pc.work_order_no, pc.product_name, pc.plan_qty,
          pc.burdening_status, pc.work_order_date, pc.update_time, sc.customer_name
        FROM prd_process_card pc
        LEFT JOIN prd_standard_card sc ON pc.product_code = sc.id
        WHERE pc.deleted = 0 ORDER BY pc.update_time DESC LIMIT 8
      `);
      recentOrders = Array.isArray(rows) ? rows : [];
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'overview' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    const alerts: Loose[] = [];
    try {
      const inkRows: Loose = await query(`
        SELECT COUNT(*) as total FROM ink_opening_record WHERE deleted = 0 AND status = 1 AND DATEDIFF(expire_time, NOW()) <= 1
      `);
      const inkAlert =
        Array.isArray(inkRows) && inkRows.length > 0 ? Number(inkRows[0].total || 0) : 0;
      if (inkAlert > 0)
        alerts.push({
          type: 'quality',
          message: `${inkAlert}罐油墨即将过期`,
          severity: 'high',
          time: '刚刚',
        });

      const dieRows: Loose = await query(`
        SELECT COUNT(*) as total FROM prd_die_template WHERE deleted = 0 AND status = 1 AND max_usage > 0 AND (current_usage / max_usage) >= 0.8
      `);
      const dieAlert =
        Array.isArray(dieRows) && dieRows.length > 0 ? Number(dieRows[0].total || 0) : 0;
      if (dieAlert > 0)
        alerts.push({
          type: 'production',
          message: `${dieAlert}个刀模/网版使用率超80%`,
          severity: 'medium',
          time: '刚刚',
        });

      if (inventoryAlert > 0)
        alerts.push({
          type: 'inventory',
          message: `${inventoryAlert}种物料库存不足`,
          severity: 'high',
          time: '刚刚',
        });
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'overview' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    let orderStats: Loose[] = [];
    try {
      const rows: Loose = await query(`
        SELECT DATE(create_time) as date, COUNT(*) as count
        FROM sal_order WHERE deleted = 0 AND create_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY DATE(create_time) ORDER BY date
      `);
      orderStats = Array.isArray(rows) ? rows : [];
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'overview' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

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
        recentOrders: recentOrders.map((o: Loose) => ({
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
  } catch {
    return NextResponse.json({ success: false, message: '获取仪表盘数据失败' }, { status: 500 });
  }
});
