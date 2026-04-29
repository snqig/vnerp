import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    let overview: any = { todayOrders: 0, todayProduction: 0, todayDelivery: 0, inventoryValue: 0, orderChange: 0, productionChange: 0, deliveryChange: 0, inventoryChange: 0 };
    try {
      const rows: any = await query(`SELECT COUNT(*) as total FROM prd_process_card WHERE deleted = 0 AND DATE(create_time) = CURDATE()`);
      if (Array.isArray(rows) && rows.length > 0) overview.todayOrders = Number(rows[0].total || 0);
    } catch (e) { console.error('ceo overview failed:', e); }

    try {
      const rows: any = await query(`SELECT COUNT(*) as total FROM sal_order WHERE deleted = 0 AND DATE(create_time) = CURDATE()`);
      if (Array.isArray(rows) && rows.length > 0) overview.todayOrders = Number(rows[0].total || 0);
    } catch (e) { console.error('ceo todayOrders failed:', e); }

    try {
      const rows: any = await query(`SELECT COALESCE(SUM(plan_qty), 0) as total FROM prd_process_card WHERE deleted = 0 AND DATE(create_time) = CURDATE()`);
      if (Array.isArray(rows) && rows.length > 0) overview.todayProduction = Number(rows[0].total || 0);
    } catch (e) { console.error('ceo todayProduction failed:', e); }

    try {
      const rows: any = await query(`SELECT COUNT(*) as total FROM wh_outbound WHERE deleted = 0 AND DATE(create_time) = CURDATE()`);
      if (Array.isArray(rows) && rows.length > 0) overview.todayDelivery = Number(rows[0].total || 0);
    } catch (e) { console.error('ceo todayDelivery failed:', e); }

    try {
      const rows: any = await query(`SELECT COALESCE(SUM(stock_qty * unit_price), 0) as total FROM inv_material WHERE deleted = 0 AND status = 1`);
      if (Array.isArray(rows) && rows.length > 0) overview.inventoryValue = Number(rows[0].total || 0);
    } catch (e) { console.error('ceo inventoryValue failed:', e); }

    let production: any = { efficiency: 0, activeOrders: 0, completedToday: 0, warningCount: 0, equipmentStatus: [] };
    try {
      const rows: any = await query(`
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
    } catch (e) { console.error('ceo production failed:', e); }

    try {
      const woRows: any = await query(`
        SELECT work_order_no, product_name, process_name, progress, status
        FROM prod_work_order WHERE deleted = 0 AND status IN (1,2,3)
        ORDER BY update_time DESC LIMIT 20
      `);
      production.activeWorkOrders = Array.isArray(woRows) ? woRows.map((r: any) => ({
        work_order_no: r.work_order_no || '',
        product_name: r.product_name || '',
        process_name: r.process_name || '',
        progress: Number(r.progress || 0),
        status: r.status === 1 ? 'pending' : r.status === 2 ? 'running' : r.status === 3 ? 'paused' : 'done',
      })) : [];
    } catch (e) { console.error('ceo activeWorkOrders failed:', e); }

    try {
      const rows: any = await query(`
        SELECT equipment_code as name, current_status as status, oee as efficiency
        FROM eqp_equipment WHERE deleted = 0 AND status = 1 ORDER BY equipment_code
      `);
      production.equipmentStatus = Array.isArray(rows) ? rows.map((r: any) => ({
        name: r.name,
        status: r.status === 1 ? 'running' : r.status === 2 ? 'idle' : r.status === 3 ? 'maintenance' : 'error',
        efficiency: Number(r.efficiency || 0),
      })) : [];
      const running = production.equipmentStatus.filter((e: any) => e.status === 'running').length;
      production.efficiency = production.equipmentStatus.length > 0 ? Math.round((running / production.equipmentStatus.length) * 100) : 0;
    } catch (e) { console.error('ceo equipment failed:', e); }

    try {
      const rows: any = await query(`
        SELECT COUNT(*) as total FROM prod_work_order WHERE deleted = 0 AND status IN (1,2,3) AND progress < 100
        AND (plan_end_time < NOW() OR priority = 1)
      `);
      if (Array.isArray(rows) && rows.length > 0) production.warningCount = Number(rows[0].total || 0);
    } catch (e) { console.error('ceo warningCount failed:', e); }

    let quality: any = { passRate: 0, totalInspections: 0, passedInspections: 0, failedInspections: 0, recentDefects: [] };
    try {
      const rows: any = await query(`SELECT COUNT(*) as total FROM qms_inspect_record WHERE deleted = 0`);
      if (Array.isArray(rows) && rows.length > 0) quality.totalInspections = Number(rows[0].total || 0);
    } catch (e) { console.error('ceo quality failed:', e); }

    try {
      const rows: any = await query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN result = 1 THEN 1 ELSE 0 END) as passed,
          SUM(CASE WHEN result = 2 THEN 1 ELSE 0 END) as failed
        FROM qms_inspect_record WHERE deleted = 0
      `);
      if (Array.isArray(rows) && rows.length > 0) {
        quality.totalInspections = Number(rows[0].total || 0);
        quality.passedInspections = Number(rows[0].passed || 0);
        quality.failedInspections = Number(rows[0].failed || 0);
        quality.passRate = quality.totalInspections > 0 ? Math.round((quality.passedInspections / quality.totalInspections) * 1000) / 10 : 0;
      }
    } catch (e) { console.error('ceo quality detail failed:', e); }

    let finance: any = { totalReceivable: 0, totalPayable: 0, monthRevenue: 0, monthExpense: 0, revenueChange: 0, expenseChange: 0 };
    try {
      const recRows: any = await query(`SELECT COALESCE(SUM(amount), 0) as total FROM fin_receivable WHERE deleted = 0 AND status = 1`);
      const payRows: any = await query(`SELECT COALESCE(SUM(amount), 0) as total FROM fin_payable WHERE deleted = 0 AND status = 1`);
      if (Array.isArray(recRows) && recRows.length > 0) finance.totalReceivable = Number(recRows[0].total || 0);
      if (Array.isArray(payRows) && payRows.length > 0) finance.totalPayable = Number(payRows[0].total || 0);
    } catch (e) { console.error('ceo finance failed:', e); }

    try {
      const revRows: any = await query(`SELECT COALESCE(SUM(amount), 0) as total FROM fin_receivable WHERE deleted = 0 AND DATE(create_time) >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`);
      const expRows: any = await query(`SELECT COALESCE(SUM(amount), 0) as total FROM fin_payable WHERE deleted = 0 AND DATE(create_time) >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`);
      if (Array.isArray(revRows) && revRows.length > 0) finance.monthRevenue = Number(revRows[0].total || 0);
      if (Array.isArray(expRows) && expRows.length > 0) finance.monthExpense = Number(expRows[0].total || 0);
    } catch (e) { console.error('ceo monthFinance failed:', e); }

    let inventory: any = { totalItems: 0, lowStock: 0, totalValue: 0, warehouseUtilization: 0 };
    try {
      const rows: any = await query(`
        SELECT COUNT(*) as total,
          SUM(CASE WHEN stock_qty <= min_stock THEN 1 ELSE 0 END) as low_stock
        FROM inv_material WHERE deleted = 0 AND status = 1
      `);
      if (Array.isArray(rows) && rows.length > 0) {
        inventory.totalItems = Number(rows[0].total || 0);
        inventory.lowStock = Number(rows[0].low_stock || 0);
      }
    } catch (e) { console.error('ceo inventory failed:', e); }

    try {
      const rows: any = await query(`SELECT COALESCE(SUM(stock_qty * unit_price), 0) as total FROM inv_material WHERE deleted = 0 AND status = 1`);
      if (Array.isArray(rows) && rows.length > 0) inventory.totalValue = Number(rows[0].total || 0);
    } catch (e) { console.error('ceo inventoryValue failed:', e); }

    try {
      const rows: any = await query(`
        SELECT COALESCE(SUM(current_qty), 0) as used, COALESCE(SUM(max_qty), 1) as total
        FROM wh_warehouse WHERE deleted = 0
      `);
      if (Array.isArray(rows) && rows.length > 0) {
        const used = Number(rows[0].used || 0);
        const total = Number(rows[0].total || 1);
        inventory.warehouseUtilization = total > 0 ? Math.round((used / total) * 100) : 0;
      }
    } catch (e) { console.error('ceo warehouseUtilization failed:', e); }

    let orderTrend: any[] = [];
    try {
      const rows: any = await query(`
        SELECT DATE(create_time) as date, COUNT(*) as count
        FROM sal_order WHERE deleted = 0 AND create_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(create_time) ORDER BY date
      `);
      orderTrend = Array.isArray(rows) ? rows : [];
    } catch (e) { console.error('ceo orderTrend failed:', e); }

    let topProducts: any[] = [];
    try {
      const rows: any = await query(`
        SELECT product_name, SUM(plan_qty) as total_qty
        FROM prd_process_card WHERE deleted = 0 AND burdening_status = 3
        GROUP BY product_name ORDER BY total_qty DESC LIMIT 5
      `);
      topProducts = Array.isArray(rows) ? rows : [];
    } catch (e) { console.error('ceo topProducts failed:', e); }

    let workshopDaily: any[] = [];
    try {
      const rows: any = await query(`
        SELECT process_name, SUM(plan_qty) as total_qty, SUM(completed_qty) as completed_qty
        FROM prd_process_card WHERE deleted = 0 AND DATE(create_time) = CURDATE()
        GROUP BY process_name ORDER BY total_qty DESC
      `);
      workshopDaily = Array.isArray(rows) ? rows.map((r: any) => ({
        name: r.process_name || '',
        total: Number(r.total_qty || 0),
        completed: Number(r.completed_qty || 0),
      })) : [];
    } catch (e) { console.error('ceo workshopDaily failed:', e); }

    let materialConsumption: any[] = [];
    try {
      const rows: any = await query(`
        SELECT material_name, SUM(qty) as total_qty
        FROM pur_order_line WHERE deleted = 0 AND DATE(create_time) = CURDATE()
        GROUP BY material_name ORDER BY total_qty DESC LIMIT 5
      `);
      materialConsumption = Array.isArray(rows) ? rows.map((r: any) => ({
        name: r.material_name || '',
        qty: Number(r.total_qty || 0),
      })) : [];
    } catch (e) { console.error('ceo materialConsumption failed:', e); }

    let monthlyMaterialConsumption: any[] = [];
    try {
      const rows: any = await query(`
        SELECT material_name, SUM(qty) as total_qty
        FROM pur_order_line WHERE deleted = 0 AND create_time >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
        GROUP BY material_name ORDER BY total_qty DESC LIMIT 5
      `);
      monthlyMaterialConsumption = Array.isArray(rows) ? rows.map((r: any) => ({
        name: r.material_name || '',
        qty: Number(r.total_qty || 0),
      })) : [];
    } catch (e) { console.error('ceo monthlyMaterialConsumption failed:', e); }

    let workshopHistory: any[] = [];
    try {
      const rows: any = await query(`
        SELECT YEAR(create_time) as year, SUM(plan_qty) as total_qty
        FROM prd_process_card WHERE deleted = 0 AND create_time >= DATE_SUB(CURDATE(), INTERVAL 4 YEAR)
        GROUP BY YEAR(create_time) ORDER BY year DESC
      `);
      workshopHistory = Array.isArray(rows) ? rows.map((r: any) => ({
        year: Number(r.year || 0),
        total: Number(r.total_qty || 0),
      })) : [];
    } catch (e) { console.error('ceo workshopHistory failed:', e); }

    let shiftData: any = { dayShift: { plan: 0, actual: 0, rate: 0 }, middleShift: { plan: 0, actual: 0, rate: 0 }, nightShift: { plan: 0, actual: 0, rate: 0 } };
    try {
      const dayRows: any = await query(`SELECT COALESCE(SUM(plan_qty), 0) as plan, COALESCE(SUM(completed_qty), 0) as actual FROM prd_process_card WHERE deleted = 0 AND DATE(create_time) = CURDATE() AND HOUR(create_time) BETWEEN 8 AND 15`);
      const midRows: any = await query(`SELECT COALESCE(SUM(plan_qty), 0) as plan, COALESCE(SUM(completed_qty), 0) as actual FROM prd_process_card WHERE deleted = 0 AND DATE(create_time) = CURDATE() AND HOUR(create_time) BETWEEN 16 AND 23`);
      const nightRows: any = await query(`SELECT COALESCE(SUM(plan_qty), 0) as plan, COALESCE(SUM(completed_qty), 0) as actual FROM prd_process_card WHERE deleted = 0 AND DATE(create_time) = CURDATE() AND (HOUR(create_time) < 8 OR HOUR(create_time) > 23)`);
      if (Array.isArray(dayRows) && dayRows.length > 0) {
        shiftData.dayShift.plan = Number(dayRows[0].plan || 0);
        shiftData.dayShift.actual = Number(dayRows[0].actual || 0);
        shiftData.dayShift.rate = shiftData.dayShift.plan > 0 ? Math.round((shiftData.dayShift.actual / shiftData.dayShift.plan) * 100) : 0;
      }
      if (Array.isArray(midRows) && midRows.length > 0) {
        shiftData.middleShift.plan = Number(midRows[0].plan || 0);
        shiftData.middleShift.actual = Number(midRows[0].actual || 0);
        shiftData.middleShift.rate = shiftData.middleShift.plan > 0 ? Math.round((shiftData.middleShift.actual / shiftData.middleShift.plan) * 100) : 0;
      }
      if (Array.isArray(nightRows) && nightRows.length > 0) {
        shiftData.nightShift.plan = Number(nightRows[0].plan || 0);
        shiftData.nightShift.actual = Number(nightRows[0].actual || 0);
        shiftData.nightShift.rate = shiftData.nightShift.plan > 0 ? Math.round((shiftData.nightShift.actual / shiftData.nightShift.plan) * 100) : 0;
      }
    } catch (e) { console.error('ceo shiftData failed:', e); }

    let powerConsumption: any[] = [];
    try {
      const rows: any = await query(`
        SELECT DATE(create_time) as date, COALESCE(SUM(power_usage), 0) as power
        FROM eqp_energy_log WHERE deleted = 0 AND create_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(create_time) ORDER BY date
      `);
      powerConsumption = Array.isArray(rows) ? rows.map((r: any) => ({
        date: r.date,
        power: Number(r.power || 0),
      })) : [];
    } catch (e) { console.error('ceo powerConsumption failed:', e); }

    let materialUsage: any[] = [];
    try {
      const rows: any = await query(`
        SELECT DATE(create_time) as date, COALESCE(SUM(consumed_qty), 0) as usage
        FROM prd_material_consumption WHERE deleted = 0 AND create_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(create_time) ORDER BY date
      `);
      materialUsage = Array.isArray(rows) ? rows.map((r: any) => ({
        date: r.date,
        usage: Number(r.usage || 0),
      })) : [];
    } catch (e) { console.error('ceo materialUsage failed:', e); }

    let processRelations: any[] = [];
    try {
      const rows: any = await query(`
        SELECT DISTINCT process_name
        FROM prd_process_card WHERE deleted = 0 AND process_name IS NOT NULL AND process_name != ''
        ORDER BY process_name
      `);
      processRelations = Array.isArray(rows) ? rows.map((r: any) => r.process_name) : [];
    } catch (e) { console.error('ceo processRelations failed:', e); }

    return NextResponse.json({
      success: true,
      data: { overview, production, quality, finance, inventory, orderTrend, topProducts, workshopDaily, materialConsumption, monthlyMaterialConsumption, workshopHistory, shiftData, powerConsumption, materialUsage, processRelations },
    });
  } catch (error) {
    console.error('获取CEO看板数据失败:', error);
    return NextResponse.json({ success: false, message: '获取CEO看板数据失败' }, { status: 500 });
  }
}
