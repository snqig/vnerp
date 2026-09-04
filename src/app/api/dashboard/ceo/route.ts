import { getTranslations } from 'next-intl/server';

;
import { NextRequest, NextResponse } from 'next/server';
import { query, SqlValue } from '@/lib/db';
import { getConfig } from '@/lib/global-config';
import { withPermission } from '@/lib/api-permissions';
import { logger } from '@/lib/logger';
import type { DbRow } from '@/types/db';

export const GET = withPermission(async (_request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  try {
    const dashboardDays = Number(getConfig('dashboard_trend_days') || 30);

    const overview: unknown = {
      todayOrders: 0,
      todayProduction: 0,
      todayDelivery: 0,
      inventoryValue: 0,
      orderChange: 0,
      productionChange: 0,
      deliveryChange: 0,
      inventoryChange: 0,
    };
    try {
      const rows = await query(
        `SELECT COUNT(*) as total FROM prd_process_card WHERE deleted = 0 AND DATE(create_time) = CURDATE()`
      );
      if (Array.isArray(rows) && rows.length > 0) overview.todayOrders = Number(rows[0].total || 0);
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'ceo' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    try {
      const rows = await query(
        `SELECT COUNT(*) as total FROM sal_order WHERE deleted = 0 AND DATE(create_time) = CURDATE()`
      );
      if (Array.isArray(rows) && rows.length > 0) overview.todayOrders = Number(rows[0].total || 0);
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'ceo' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    try {
      const rows = await query(
        `SELECT COALESCE(SUM(plan_qty), 0) as total FROM prd_process_card WHERE deleted = 0 AND DATE(create_time) = CURDATE()`
      );
      if (Array.isArray(rows) && rows.length > 0)
        overview.todayProduction = Number(rows[0].total || 0);
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'ceo' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    try {
      const rows = await query(
        `SELECT COUNT(*) as total FROM inv_outbound_order WHERE deleted = 0 AND DATE(create_time) = CURDATE()`
      );
      if (Array.isArray(rows) && rows.length > 0)
        overview.todayDelivery = Number(rows[0].total || 0);
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'ceo' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    try {
      const rows = await query(
        `SELECT COALESCE(SUM(i.available_qty * m.purchase_price), 0) as total 
         FROM inv_material m 
         LEFT JOIN inv_inventory i ON m.id = i.material_id
         WHERE m.deleted = 0 AND m.status = 1 AND i.deleted = 0`
      );
      if (Array.isArray(rows) && rows.length > 0)
        overview.inventoryValue = Number(rows[0].total || 0);
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'ceo' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    const production: unknown = {
      efficiency: 0,
      activeOrders: 0,
      completedToday: 0,
      warningCount: 0,
      equipmentStatus: [],
    };
    try {
      const rows = await query(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN burdening_status IN (1,2) THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN burdening_status = 3 AND DATE(update_time) = CURDATE() THEN 1 ELSE 0 END) as completed
        FROM prd_process_card WHERE deleted = 0
      `);
      if (Array.isArray(rows) && rows.length > 0) {
        production.activeOrders = Number(rows[0].active || 0);
        production.completedToday = Number(rows[0].completed || 0);
      }
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'ceo' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    try {
      const woRows = await query(`
        SELECT work_order_no, product_name, customer_name, status, priority
        FROM prod_work_order WHERE deleted = 0 AND status IN ('pending','producing')
        ORDER BY update_time DESC LIMIT 20
      `);
      production.activeWorkOrders = Array.isArray(woRows)
        ? woRows.map((r: DbRow) => ({
            work_order_no: r.work_order_no || '',
            product_name: r.product_name || '',
            customer_name: r.customer_name || '',
            status: r.status,
            priority: r.priority,
          }))
        : [];
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'ceo' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    try {
      const rows = await query(`
        SELECT equipment_code as name, current_status as status, oee as efficiency
        FROM eqp_equipment WHERE deleted = 0 AND status = 1 ORDER BY equipment_code
      `);
      production.equipmentStatus = Array.isArray(rows)
        ? rows.map((r: DbRow) => ({
            name: r.name,
            status:
              r.status === 1
                ? 'running'
                : r.status === 2
                  ? 'idle'
                  : r.status === 3
                    ? 'maintenance'
                    : 'error',
            efficiency: Number(r.efficiency || 0),
          }))
        : [];
      const running = production.equipmentStatus.filter(
        (e: DbRow) => e.status === 'running'
      ).length;
      production.efficiency =
        production.equipmentStatus.length > 0
          ? Math.round((running / production.equipmentStatus.length) * 100)
          : 0;
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'ceo' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    try {
      const rows = await query(`
        SELECT COUNT(*) as total FROM prod_work_order WHERE deleted = 0 AND status IN ('pending','producing')
        AND (plan_end_date < CURDATE() OR priority = 'urgent')
      `);
      if (Array.isArray(rows) && rows.length > 0)
        production.warningCount = Number(rows[0].total || 0);
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'ceo' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    const quality: unknown = {
      passRate: 0,
      totalInspections: 0,
      passedInspections: 0,
      failedInspections: 0,
      recentDefects: [],
    };
    try {
      const rows = await query(`SELECT COUNT(*) as total FROM qc_inspection WHERE deleted = 0`);
      if (Array.isArray(rows) && rows.length > 0)
        quality.totalInspections = Number(rows[0].total || 0);
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'ceo' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    try {
      const rows = await query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN inspection_result = 1 THEN 1 ELSE 0 END) as passed,
          SUM(CASE WHEN inspection_result = 2 THEN 1 ELSE 0 END) as failed
        FROM qc_inspection WHERE deleted = 0
      `);
      if (Array.isArray(rows) && rows.length > 0) {
        quality.totalInspections = Number(rows[0].total || 0);
        quality.passedInspections = Number(rows[0].passed || 0);
        quality.failedInspections = Number(rows[0].failed || 0);
        quality.passRate =
          quality.totalInspections > 0
            ? Math.round((quality.passedInspections / quality.totalInspections) * 1000) / 10
            : 0;
      }
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'ceo' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    const finance: unknown = {
      totalReceivable: 0,
      totalPayable: 0,
      monthRevenue: 0,
      monthExpense: 0,
      revenueChange: 0,
      expenseChange: 0,
    };
    try {
      const recRows = await query(
        `SELECT COALESCE(SUM(amount), 0) as total FROM fin_receivable WHERE deleted = 0 AND status = 1`
      );
      const payRows = await query(
        `SELECT COALESCE(SUM(amount), 0) as total FROM fin_payable WHERE deleted = 0 AND status = 1`
      );
      if (Array.isArray(recRows) && recRows.length > 0)
        finance.totalReceivable = Number(recRows[0].total || 0);
      if (Array.isArray(payRows) && payRows.length > 0)
        finance.totalPayable = Number(payRows[0].total || 0);
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'ceo' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    try {
      const revRows = await query(
        `SELECT COALESCE(SUM(amount), 0) as total FROM fin_receivable WHERE deleted = 0 AND DATE(create_time) >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`
      );
      const expRows = await query(
        `SELECT COALESCE(SUM(amount), 0) as total FROM fin_payable WHERE deleted = 0 AND DATE(create_time) >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`
      );
      if (Array.isArray(revRows) && revRows.length > 0)
        finance.monthRevenue = Number(revRows[0].total || 0);
      if (Array.isArray(expRows) && expRows.length > 0)
        finance.monthExpense = Number(expRows[0].total || 0);
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'ceo' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    const inventory: unknown = {
      totalItems: 0,
      lowStock: 0,
      totalValue: 0,
      warehouseUtilization: 0,
    };
    try {
      const rows = await query(`
        SELECT m.id, COALESCE(SUM(i.available_qty), 0) as total_qty, COALESCE(m.min_stock, m.safety_stock, 0) as threshold
        FROM inv_material m
        LEFT JOIN inv_inventory i ON m.id = i.material_id AND i.deleted = 0
        WHERE m.deleted = 0 AND m.status = 1
        GROUP BY m.id, m.min_stock, m.safety_stock
      `);
      if (Array.isArray(rows) && rows.length > 0) {
        inventory.totalItems = rows.length;
        inventory.lowStock = rows.filter((r: DbRow) => {
          const qty = Number(r.total_qty || 0);
          const threshold = Number(r.threshold || 0);
          return threshold > 0 && qty <= threshold;
        }).length;
      }
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'ceo' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    try {
      const rows = await query(
        `SELECT COALESCE(SUM(i.available_qty * m.purchase_price), 0) as total 
         FROM inv_material m 
         LEFT JOIN inv_inventory i ON m.id = i.material_id AND i.deleted = 0
         WHERE m.deleted = 0 AND m.status = 1`
      );
      if (Array.isArray(rows) && rows.length > 0) inventory.totalValue = Number(rows[0].total || 0);
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'ceo' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    try {
      const rows = await query(`
        SELECT COUNT(*) as total FROM inv_warehouse WHERE deleted = 0
      `);
      if (Array.isArray(rows) && rows.length > 0) {
        // 仓库数（无容量数据，无法计算真实利用率，故返回仓库数量而非虚构百分比）
        inventory.warehouseUtilization = Number(rows[0].total || 0);
      }
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'ceo' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    let orderTrend: SqlValue[] = [];
    try {
      const rows = await query(`
        SELECT DATE(create_time) as date, COUNT(*) as count
        FROM sal_order WHERE deleted = 0 AND create_time >= DATE_SUB(CURDATE(), INTERVAL ${dashboardDays} DAY)
        GROUP BY DATE(create_time) ORDER BY date
      `);
      orderTrend = Array.isArray(rows) ? rows : [];
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'ceo' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    let topProducts: SqlValue[] = [];
    try {
      const rows = await query(`
        SELECT product_name, SUM(plan_qty) as total_qty
        FROM prd_process_card WHERE deleted = 0 AND burdening_status = 3
        GROUP BY product_name ORDER BY total_qty DESC LIMIT 5
      `);
      topProducts = Array.isArray(rows) ? rows : [];
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'ceo' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    let workshopDaily: SqlValue[] = [];
    try {
      const rows = await query(`
        SELECT product_name, SUM(plan_qty) as total_qty
        FROM prd_process_card WHERE deleted = 0 AND DATE(create_time) = CURDATE()
        GROUP BY product_name ORDER BY total_qty DESC
      `);
      workshopDaily = Array.isArray(rows)
        ? rows.map((r: DbRow) => ({
            name: r.product_name || '',
            total: Number(r.total_qty || 0),
            completed: Number(r.total_qty || 0),
          }))
        : [];
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'ceo' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    let materialConsumption: SqlValue[] = [];
    try {
      const rows = await query(`
        SELECT material_name, SUM(order_qty) as total_qty
        FROM pur_purchase_order_line WHERE DATE(create_time) = CURDATE()
        GROUP BY material_name ORDER BY total_qty DESC LIMIT 5
      `);
      materialConsumption = Array.isArray(rows)
        ? rows.map((r: DbRow) => ({
            name: r.material_name || '',
            qty: Number(r.total_qty || 0),
          }))
        : [];
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'ceo' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    let monthlyMaterialConsumption: SqlValue[] = [];
    try {
      const rows = await query(`
        SELECT material_name, SUM(order_qty) as total_qty
        FROM pur_purchase_order_line WHERE create_time >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
        GROUP BY material_name ORDER BY total_qty DESC LIMIT 5
      `);
      monthlyMaterialConsumption = Array.isArray(rows)
        ? rows.map((r: DbRow) => ({
            name: r.material_name || '',
            qty: Number(r.total_qty || 0),
          }))
        : [];
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'ceo' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    let workshopHistory: SqlValue[] = [];
    try {
      const rows = await query(`
        SELECT YEAR(create_time) as year, SUM(plan_qty) as total_qty
        FROM prd_process_card WHERE deleted = 0 AND create_time >= DATE_SUB(CURDATE(), INTERVAL 4 YEAR)
        GROUP BY YEAR(create_time) ORDER BY year DESC
      `);
      workshopHistory = Array.isArray(rows)
        ? rows.map((r: DbRow) => ({
            year: Number(r.year || 0),
            total: Number(r.total_qty || 0),
          }))
        : [];
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'ceo' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    const shiftData: unknown = {
      dayShift: { plan: 0, actual: 0, rate: 0 },
      middleShift: { plan: 0, actual: 0, rate: 0 },
      nightShift: { plan: 0, actual: 0, rate: 0 },
    };
    try {
      // 计划量来自 prd_process_card（按创建时间分班次）
      const planRows = await query(`
        SELECT
          COALESCE(SUM(CASE WHEN HOUR(create_time) BETWEEN 8 AND 15 THEN plan_qty ELSE 0 END), 0) as day_plan,
          COALESCE(SUM(CASE WHEN HOUR(create_time) BETWEEN 16 AND 23 THEN plan_qty ELSE 0 END), 0) as mid_plan,
          COALESCE(SUM(CASE WHEN (HOUR(create_time) < 8 OR HOUR(create_time) > 23) THEN plan_qty ELSE 0 END), 0) as night_plan
        FROM prd_process_card WHERE deleted = 0 AND DATE(create_time) = CURDATE()
      `);
      // 实际完成量来自 prd_work_report.completed_qty（按报工开始时间分班次）
      const actualRows = await query(`
        SELECT
          COALESCE(SUM(CASE WHEN HOUR(start_time) BETWEEN 8 AND 15 THEN completed_qty ELSE 0 END), 0) as day_actual,
          COALESCE(SUM(CASE WHEN HOUR(start_time) BETWEEN 16 AND 23 THEN completed_qty ELSE 0 END), 0) as mid_actual,
          COALESCE(SUM(CASE WHEN (HOUR(start_time) < 8 OR HOUR(start_time) > 23) THEN completed_qty ELSE 0 END), 0) as night_actual
        FROM prd_work_report WHERE deleted = 0 AND DATE(start_time) = CURDATE()
      `);
      const p = Array.isArray(planRows) && planRows.length > 0 ? planRows[0] : {};
      const a = Array.isArray(actualRows) && actualRows.length > 0 ? actualRows[0] : {};
      shiftData.dayShift.plan = Number(p.day_plan || 0);
      shiftData.dayShift.actual = Number(a.day_actual || 0);
      shiftData.dayShift.rate =
        shiftData.dayShift.plan > 0
          ? Math.round((shiftData.dayShift.actual / shiftData.dayShift.plan) * 100)
          : 0;
      shiftData.middleShift.plan = Number(p.mid_plan || 0);
      shiftData.middleShift.actual = Number(a.mid_actual || 0);
      shiftData.middleShift.rate =
        shiftData.middleShift.plan > 0
          ? Math.round((shiftData.middleShift.actual / shiftData.middleShift.plan) * 100)
          : 0;
      shiftData.nightShift.plan = Number(p.night_plan || 0);
      shiftData.nightShift.actual = Number(a.night_actual || 0);
      shiftData.nightShift.rate =
        shiftData.nightShift.plan > 0
          ? Math.round((shiftData.nightShift.actual / shiftData.nightShift.plan) * 100)
          : 0;
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'ceo' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    const powerConsumption: SqlValue[] = [];

    const materialUsage: SqlValue[] = [];

    let processRelations: SqlValue[] = [];
    try {
      const rows = await query(`
        SELECT DISTINCT product_name
        FROM prd_process_card WHERE deleted = 0 AND product_name IS NOT NULL AND product_name != ''
        ORDER BY product_name
      `);
      processRelations = Array.isArray(rows) ? rows.map((r: DbRow) => r.product_name) : [];
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'ceo' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        overview,
        production,
        quality,
        finance,
        inventory,
        orderTrend,
        topProducts,
        workshopDaily,
        materialConsumption,
        monthlyMaterialConsumption,
        workshopHistory,
        shiftData,
        powerConsumption,
        materialUsage,
        processRelations,
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: ts('k_g0xfcb') }, { status: 500 });
  }
});
