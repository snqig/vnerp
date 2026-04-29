import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, withErrorHandler } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'month';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  let dateFilter = '';
  const params: any[] = [];

  if (startDate && endDate) {
    dateFilter = 'AND create_time BETWEEN ? AND ?';
    params.push(startDate, endDate);
  } else if (period === 'week') {
    dateFilter = 'AND create_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
  } else if (period === 'month') {
    dateFilter = 'AND create_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
  } else if (period === 'quarter') {
    dateFilter = 'AND create_time >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)';
  } else if (period === 'year') {
    dateFilter = 'AND create_time >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)';
  }

  // ========================================
  // 1. OTD (On-Time Delivery) 准时交付率
  //    公式: 准时交付订单数 / 总应交付订单数 × 100%
  //    数据来源: sal_order.delivery_date vs 实际出库时间
  // ========================================
  let otd: any = { rate: 0, totalOrders: 0, onTimeOrders: 0, lateOrders: 0, details: [] };
  try {
    const otdRows: any = await query(`
      SELECT
        COUNT(*) as total_orders,
        SUM(CASE WHEN so.status >= 40 THEN 1 ELSE 0 END) as delivered_orders,
        SUM(CASE WHEN so.status >= 40 AND EXISTS (
          SELECT 1 FROM inv_sales_outbound iso
          WHERE iso.order_id = so.id AND iso.deleted = 0 AND iso.status = 3
          AND DATE(iso.create_time) <= so.delivery_date
        ) THEN 1 ELSE 0 END) as on_time_orders
      FROM sal_order so
      WHERE so.deleted = 0 AND so.status >= 20 ${dateFilter}
    `, params);

    if (Array.isArray(otdRows) && otdRows.length > 0) {
      otd.totalOrders = Number(otdRows[0].total_orders || 0);
      otd.onTimeOrders = Number(otdRows[0].on_time_orders || 0);
      otd.lateOrders = Number(otdRows[0].delivered_orders || 0) - otd.onTimeOrders;
      otd.rate = otd.totalOrders > 0 ? Math.round((otd.onTimeOrders / otd.totalOrders) * 10000) / 100 : 0;
    }
  } catch (e) { console.error('OTD calc failed:', e); }

  // ========================================
  // 2. 库存周转率 (Inventory Turnover)
  //    公式: 销售成本 / 平均库存价值
  //    数据来源: fin_voucher(出库成本) / inv_inventory_batch(库存价值)
  // ========================================
  let inventoryTurnover: any = { rate: 0, costOfGoods: 0, avgInventoryValue: 0, daysOnHand: 0 };
  try {
    const costRows: any = await query(`
      SELECT COALESCE(SUM(amount), 0) as total_cost
      FROM fin_voucher
      WHERE deleted = 0 AND credit_account = '成品库存' ${dateFilter.replace('create_time', 'voucher_date')}
    `, params);

    const invValueRows: any = await query(`
      SELECT COALESCE(SUM(available_qty * unit_price), 0) as total_value
      FROM inv_inventory_batch
      WHERE deleted = 0 AND status = 'normal'
    `);

    inventoryTurnover.costOfGoods = Number(costRows[0]?.total_cost || 0);
    inventoryTurnover.avgInventoryValue = Number(invValueRows[0]?.total_value || 0);
    inventoryTurnover.rate = inventoryTurnover.avgInventoryValue > 0
      ? Math.round((inventoryTurnover.costOfGoods / inventoryTurnover.avgInventoryValue) * 100) / 100
      : 0;
    inventoryTurnover.daysOnHand = inventoryTurnover.rate > 0
      ? Math.round(365 / inventoryTurnover.rate)
      : 0;
  } catch (e) { console.error('Inventory turnover calc failed:', e); }

  // ========================================
  // 3. OEE (Overall Equipment Effectiveness) 设备综合效率
  //    公式: OEE = 可用率(A) × 表现率(P) × 质量率(Q)
  //    数据来源: eqp_equipment + 生产报工 + 质检记录
  // ========================================
  let oee: any = { overall: 0, availability: 0, performance: 0, quality: 0, equipmentDetails: [] };
  try {
    const oeeRows: any = await query(`
      SELECT
        id, equipment_code, equipment_name,
        COALESCE(oee_availability, 0) as availability,
        COALESCE(oee_performance, 0) as performance,
        COALESCE(oee_quality, 0) as quality,
        COALESCE(oee_overall, 0) as overall
      FROM eqp_equipment
      WHERE deleted = 0 AND status = 1
    `);

    if (Array.isArray(oeeRows) && oeeRows.length > 0) {
      oee.equipmentDetails = oeeRows.map((r: any) => ({
        id: r.id,
        code: r.equipment_code,
        name: r.equipment_name,
        availability: Number(r.availability),
        performance: Number(r.performance),
        quality: Number(r.quality),
        overall: Number(r.overall),
      }));

      const count = oeeRows.length;
      oee.availability = Math.round(oeeRows.reduce((s: number, r: any) => s + Number(r.availability), 0) / count * 100) / 100;
      oee.performance = Math.round(oeeRows.reduce((s: number, r: any) => s + Number(r.performance), 0) / count * 100) / 100;
      oee.quality = Math.round(oeeRows.reduce((s: number, r: any) => s + Number(r.quality), 0) / count * 100) / 100;
      oee.overall = Math.round(oee.availability * oee.performance * oee.quality / 10000 * 100) / 100;
    }
  } catch (e) { console.error('OEE calc failed:', e); }

  // ========================================
  // 4. 质量合格率 (Quality Pass Rate)
  //    公式: 合格批次数 / 总检验批次数 × 100%
  //    数据来源: qc_incoming_inspection + qc_process_inspection + qc_final_inspection
  // ========================================
  let qualityRate: any = { overall: 0, incoming: 0, process: 0, final: 0, incomingTotal: 0, incomingPassed: 0, processTotal: 0, processPassed: 0, finalTotal: 0, finalPassed: 0 };
  try {
    const incomingRows: any = await query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN inspection_result IN ('qualified', '合格') THEN 1 ELSE 0 END) as passed
      FROM qc_incoming_inspection WHERE deleted = 0 ${dateFilter}
    `, params);

    qualityRate.incomingTotal = Number(incomingRows[0]?.total || 0);
    qualityRate.incomingPassed = Number(incomingRows[0]?.passed || 0);
    qualityRate.incoming = qualityRate.incomingTotal > 0
      ? Math.round((qualityRate.incomingPassed / qualityRate.incomingTotal) * 10000) / 100 : 0;
  } catch (e) { console.error('Quality incoming calc failed:', e); }

  try {
    const processRows: any = await query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN inspection_result IN ('qualified', '合格', 'pass') THEN 1 ELSE 0 END) as passed
      FROM qc_process_inspection WHERE deleted = 0 ${dateFilter}
    `, params);

    qualityRate.processTotal = Number(processRows[0]?.total || 0);
    qualityRate.processPassed = Number(processRows[0]?.passed || 0);
    qualityRate.process = qualityRate.processTotal > 0
      ? Math.round((qualityRate.processPassed / qualityRate.processTotal) * 10000) / 100 : 0;
  } catch (e) { console.error('Quality process calc failed:', e); }

  try {
    const finalRows: any = await query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN inspection_result IN ('qualified', '合格', 'pass') THEN 1 ELSE 0 END) as passed
      FROM qc_final_inspection WHERE deleted = 0 ${dateFilter}
    `, params);

    qualityRate.finalTotal = Number(finalRows[0]?.total || 0);
    qualityRate.finalPassed = Number(finalRows[0]?.passed || 0);
    qualityRate.final = qualityRate.finalTotal > 0
      ? Math.round((qualityRate.finalPassed / qualityRate.finalTotal) * 10000) / 100 : 0;
  } catch (e) { console.error('Quality final calc failed:', e); }

  const totalInspections = qualityRate.incomingTotal + qualityRate.processTotal + qualityRate.finalTotal;
  const totalPassed = qualityRate.incomingPassed + qualityRate.processPassed + qualityRate.finalPassed;
  qualityRate.overall = totalInspections > 0
    ? Math.round((totalPassed / totalInspections) * 10000) / 100 : 0;

  // ========================================
  // 5. 供应商评分 (Supplier Score)
  //    公式: 质量40% + 交付30% + 价格30%
  //    数据来源: pur_supplier + 质检/交付/采购数据
  // ========================================
  let supplierScores: any[] = [];
  try {
    const supplierRows: any = await query(`
      SELECT
        ps.id, ps.supplier_name,
        COALESCE(ps.quality_score, 0) as quality_score,
        COALESCE(ps.delivery_score, 0) as delivery_score,
        COALESCE(ps.price_score, 0) as price_score,
        COALESCE(ps.overall_score, 0) as overall_score
      FROM pur_supplier ps
      WHERE ps.deleted = 0 AND ps.status = 1
      ORDER BY ps.overall_score DESC
      LIMIT 10
    `);

    if (Array.isArray(supplierRows)) {
      supplierScores = supplierRows.map((s: any) => {
        const q = Number(s.quality_score);
        const d = Number(s.delivery_score);
        const p = Number(s.price_score);
        const overall = q > 0 || d > 0 || p > 0 ? Math.round((q * 0.4 + d * 0.3 + p * 0.3) * 100) / 100 : 0;
        return {
          id: s.id,
          name: s.supplier_name,
          qualityScore: q,
          deliveryScore: d,
          priceScore: p,
          overallScore: overall,
        };
      });
    }
  } catch (e) { console.error('Supplier score calc failed:', e); }

  // ========================================
  // 6. 客户信用额度使用率
  //    数据来源: crm_customer + sal_order
  // ========================================
  let customerCredit: any[] = [];
  try {
    const creditRows: any = await query(`
      SELECT
        cc.id, cc.customer_name,
        COALESCE(cc.credit_limit, 0) as credit_limit,
        COALESCE(cc.credit_used, 0) as credit_used,
        CASE WHEN COALESCE(cc.credit_limit, 0) > 0
          THEN ROUND(COALESCE(cc.credit_used, 0) / cc.credit_limit * 100, 2)
          ELSE 0 END as usage_rate
      FROM crm_customer cc
      WHERE cc.deleted = 0 AND COALESCE(cc.credit_limit, 0) > 0
      ORDER BY usage_rate DESC
      LIMIT 10
    `);

    if (Array.isArray(creditRows)) {
      customerCredit = creditRows.map((c: any) => ({
        id: c.id,
        name: c.customer_name,
        creditLimit: Number(c.credit_limit),
        creditUsed: Number(c.credit_used),
        usageRate: Number(c.usage_rate),
      }));
    }
  } catch (e) { console.error('Customer credit calc failed:', e); }

  // ========================================
  // 7. FIFO合规率
  //    公式: 遵循FIFO的出库次数 / 总出库次数 × 100%
  //    数据来源: inv_fifo_override_log
  // ========================================
  let fifoCompliance: any = { rate: 0, totalOutbound: 0, fifoFollowed: 0, overrides: 0, pendingApprovals: 0 };
  try {
    const fifoRows: any = await query(`
      SELECT
        COUNT(*) as total_overrides,
        SUM(CASE WHEN approval_status = 0 THEN 1 ELSE 0 END) as pending
      FROM inv_fifo_override_log
      WHERE 1=1 ${dateFilter}
    `, params);

    const outboundRows: any = await query(`
      SELECT COUNT(*) as total
      FROM inv_inventory_transaction
      WHERE trans_type = 'out' AND deleted = 0 ${dateFilter}
    `, params);

    fifoCompliance.overrides = Number(fifoRows[0]?.total_overrides || 0);
    fifoCompliance.pendingApprovals = Number(fifoRows[0]?.pending || 0);
    fifoCompliance.totalOutbound = Number(outboundRows[0]?.total || 0);
    fifoCompliance.fifoFollowed = fifoCompliance.totalOutbound - fifoCompliance.overrides;
    fifoCompliance.rate = fifoCompliance.totalOutbound > 0
      ? Math.round((fifoCompliance.fifoFollowed / fifoCompliance.totalOutbound) * 10000) / 100 : 100;
  } catch (e) { console.error('FIFO compliance calc failed:', e); }

  // ========================================
  // 8. 部门协作效率
  //    数据来源: 合同评审耗时 / 打样转量产耗时
  // ========================================
  let departmentEfficiency: any = { contractReviewAvgDays: 0, sampleToMassAvgDays: 0, reviewCount: 0, conversionCount: 0 };
  try {
    const reviewRows: any = await query(`
      SELECT
        COUNT(*) as total,
        AVG(DATEDIFF(COALESCE(update_time, NOW()), create_time)) as avg_days
      FROM biz_contract_review
      WHERE deleted = 0 AND status = 3 ${dateFilter}
    `, params);

    departmentEfficiency.reviewCount = Number(reviewRows[0]?.total || 0);
    departmentEfficiency.contractReviewAvgDays = Math.round(Number(reviewRows[0]?.avg_days || 0) * 100) / 100;
  } catch (e) { console.error('Department efficiency calc failed:', e); }

  try {
    const conversionRows: any = await query(`
      SELECT
        COUNT(*) as total,
        AVG(DATEDIFF(COALESCE(conversion_date, NOW()), create_time)) as avg_days
      FROM eng_sample_to_mass
      WHERE deleted = 0 AND status = 3 ${dateFilter}
    `, params);

    departmentEfficiency.conversionCount = Number(conversionRows[0]?.total || 0);
    departmentEfficiency.sampleToMassAvgDays = Math.round(Number(conversionRows[0]?.avg_days || 0) * 100) / 100;
  } catch (e) { console.error('Sample conversion calc failed:', e); }

  // ========================================
  // 9. 墨耗率 (Ink Consumption Rate)
  //    公式: 实际油墨消耗量 / 理论消耗量 × 100%
  //    数据来源: dcprint_ink_usage + 配方理论用量
  // ========================================
  let inkConsumptionRate: any = { rate: 0, actualUsage: 0, theoreticalUsage: 0, wasteRate: 0, byWorkOrder: [] };
  try {
    const inkUsageRows: any = await query(`
      SELECT
        COALESCE(SUM(actual_weight), 0) as actual_usage,
        COALESCE(SUM(theoretical_weight), 0) as theoretical_usage
      FROM dcprint_ink_usage
      WHERE deleted = 0 ${dateFilter}
    `, params);

    inkConsumptionRate.actualUsage = Number(inkUsageRows[0]?.actual_usage || 0);
    inkConsumptionRate.theoreticalUsage = Number(inkUsageRows[0]?.theoretical_usage || 0);
    if (inkConsumptionRate.theoreticalUsage > 0) {
      inkConsumptionRate.rate = Math.round((inkConsumptionRate.actualUsage / inkConsumptionRate.theoreticalUsage) * 10000) / 100;
      inkConsumptionRate.wasteRate = Math.round((1 - inkConsumptionRate.theoreticalUsage / inkConsumptionRate.actualUsage) * 10000) / 100;
    }
  } catch (e) { console.error('Ink consumption rate calc failed:', e); }

  try {
    const inkByWO: any = await query(`
      SELECT
        iu.work_order_no,
        SUM(iu.actual_weight) as actual_usage,
        SUM(iu.theoretical_weight) as theoretical_usage,
        CASE WHEN SUM(iu.theoretical_weight) > 0
          THEN ROUND(SUM(iu.actual_weight) / SUM(iu.theoretical_weight) * 100, 2)
          ELSE 0 END as consumption_rate
      FROM dcprint_ink_usage iu
      WHERE iu.deleted = 0 ${dateFilter}
      GROUP BY iu.work_order_no
      ORDER BY consumption_rate DESC
      LIMIT 10
    `, params);
    inkConsumptionRate.byWorkOrder = Array.isArray(inkByWO) ? inkByWO : [];
  } catch (e) { console.error('Ink by work order calc failed:', e); }

  // ========================================
  // 10. 纸张利用率 (Paper Utilization Rate)
  //     公式: 合格品数量 / 投入纸张数量 × 100%
  //     数据来源: prd_work_report + 物料出库
  // ========================================
  let paperUtilizationRate: any = { rate: 0, inputQty: 0, outputQty: 0, scrapQty: 0, byProcess: [] };
  try {
    const paperRows: any = await query(`
      SELECT
        COALESCE(SUM(completed_qty), 0) as total_completed,
        COALESCE(SUM(qualified_qty), 0) as total_qualified,
        COALESCE(SUM(scrap_qty), 0) as total_scrap
      FROM prd_work_report
      WHERE deleted = 0 ${dateFilter}
    `, params);

    paperUtilizationRate.outputQty = Number(paperRows[0]?.total_qualified || 0);
    paperUtilizationRate.scrapQty = Number(paperRows[0]?.total_scrap || 0);
    paperUtilizationRate.inputQty = Number(paperRows[0]?.total_completed || 0) + paperUtilizationRate.scrapQty;

    if (paperUtilizationRate.inputQty > 0) {
      paperUtilizationRate.rate = Math.round((paperUtilizationRate.outputQty / paperUtilizationRate.inputQty) * 10000) / 100;
    }
  } catch (e) { console.error('Paper utilization rate calc failed:', e); }

  try {
    const paperByProcess: any = await query(`
      SELECT
        process_name,
        SUM(completed_qty) as total_completed,
        SUM(qualified_qty) as total_qualified,
        SUM(scrap_qty) as total_scrap,
        CASE WHEN SUM(completed_qty) + SUM(scrap_qty) > 0
          THEN ROUND(SUM(qualified_qty) / (SUM(completed_qty) + SUM(scrap_qty)) * 100, 2)
          ELSE 0 END as utilization_rate
      FROM prd_work_report
      WHERE deleted = 0 ${dateFilter}
      GROUP BY process_name
      ORDER BY utilization_rate ASC
    `, params);
    paperUtilizationRate.byProcess = Array.isArray(paperByProcess) ? paperByProcess : [];
  } catch (e) { console.error('Paper by process calc failed:', e); }

  // ========================================
  // 11. 余墨再利用率 (Surplus Ink Reuse Rate)
  //     公式: 再利用余墨量 / 总余墨退回量 × 100%
  //     数据来源: dcprint_ink_surplus + ink_dispatch
  // ========================================
  let surplusInkReuseRate: any = { rate: 0, totalReturned: 0, totalReused: 0, totalDiscarded: 0, pendingReuse: 0 };
  try {
    const surplusRows: any = await query(`
      SELECT
        COALESCE(SUM(current_weight), 0) as total_surplus,
        COALESCE(SUM(CASE WHEN status = 'reused' THEN current_weight ELSE 0 END), 0) as total_reused,
        COALESCE(SUM(CASE WHEN status = 'discarded' THEN current_weight ELSE 0 END), 0) as total_discarded,
        COALESCE(SUM(CASE WHEN status = 'available' THEN current_weight ELSE 0 END), 0) as pending_reuse
      FROM dcprint_ink_surplus
      WHERE deleted = 0 ${dateFilter}
    `, params);

    surplusInkReuseRate.totalReturned = Number(surplusRows[0]?.total_surplus || 0);
    surplusInkReuseRate.totalReused = Number(surplusRows[0]?.total_reused || 0);
    surplusInkReuseRate.totalDiscarded = Number(surplusRows[0]?.total_discarded || 0);
    surplusInkReuseRate.pendingReuse = Number(surplusRows[0]?.pending_reuse || 0);

    if (surplusInkReuseRate.totalReturned > 0) {
      surplusInkReuseRate.rate = Math.round((surplusInkReuseRate.totalReused / surplusInkReuseRate.totalReturned) * 10000) / 100;
    }
  } catch (e) { console.error('Surplus ink reuse rate calc failed:', e); }

  // ========================================
  // 12. 换版时间 (Setup/Changeover Time)
  //     公式: 平均换版时间 = 总换版时间 / 换版次数
  //     数据来源: prd_work_report (工序间隔) + 设备状态
  // ========================================
  let setupTime: any = { avgMinutes: 0, totalSetups: 0, totalMinutes: 0, byEquipment: [], trend: [] };
  try {
    const setupRows: any = await query(`
      SELECT
        e.equipment_name,
        e.equipment_code,
        COUNT(DISTINCT wr.work_order_id) as setup_count,
        AVG(
          TIMESTAMPDIFF(MINUTE,
            LAG(wr.end_time) OVER (PARTITION BY wr.equipment_id ORDER BY wr.start_time),
            wr.start_time
          )
        ) as avg_setup_minutes
      FROM prd_work_report wr
      JOIN eqp_equipment e ON wr.equipment_id = e.id
      WHERE wr.deleted = 0 AND wr.start_time IS NOT NULL AND wr.end_time IS NOT NULL ${dateFilter}
      GROUP BY wr.equipment_id, e.equipment_name, e.equipment_code
      HAVING setup_count > 1
      ORDER BY avg_setup_minutes DESC
    `, params);

    if (Array.isArray(setupRows) && setupRows.length > 0) {
      setupTime.byEquipment = setupRows.map((r: any) => ({
        equipmentCode: r.equipment_code,
        equipmentName: r.equipment_name,
        setupCount: Number(r.setup_count),
        avgSetupMinutes: Math.round(Number(r.avg_setup_minutes || 0) * 100) / 100,
      }));
      setupTime.totalSetups = setupTime.byEquipment.reduce((s: number, r: any) => s + r.setupCount, 0);
      setupTime.totalMinutes = setupTime.byEquipment.reduce((s: number, r: any) => s + r.avgSetupMinutes * r.setupCount, 0);
      setupTime.avgMinutes = setupTime.totalSetups > 0
        ? Math.round((setupTime.totalMinutes / setupTime.totalSetups) * 100) / 100
        : 0;
    }
  } catch (e) { console.error('Setup time calc failed:', e); }

  // ========================================
  // 13. 首次通过率 FTQ (First Time Quality)
  //     公式: 首检合格次数 / 总首检次数 × 100%
  //     数据来源: prd_work_report (is_first_piece + first_piece_status)
  // ========================================
  let ftq: any = { rate: 0, totalFirstPiece: 0, passedFirstPiece: 0, failedFirstPiece: 0 };
  try {
    const ftqRows: any = await query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN first_piece_status IN ('qualified', '合格', 'pass', '1') THEN 1 ELSE 0 END) as passed
      FROM prd_work_report
      WHERE deleted = 0 AND is_first_piece = 1 ${dateFilter}
    `, params);

    ftq.totalFirstPiece = Number(ftqRows[0]?.total || 0);
    ftq.passedFirstPiece = Number(ftqRows[0]?.passed || 0);
    ftq.failedFirstPiece = ftq.totalFirstPiece - ftq.passedFirstPiece;
    ftq.rate = ftq.totalFirstPiece > 0
      ? Math.round((ftq.passedFirstPiece / ftq.totalFirstPiece) * 10000) / 100
      : 0;
  } catch (e) { console.error('FTQ calc failed:', e); }

  // ========================================
  // 14. 呆滞库存率 (Stale Inventory Rate)
  //     公式: 过期/冻结批次价值 / 总库存价值 × 100%
  //     数据来源: inv_inventory_batch
  // ========================================
  let staleInventoryRate: any = { rate: 0, totalInventoryValue: 0, staleValue: 0, expiredValue: 0, frozenValue: 0, nearExpiryValue: 0 };
  try {
    const staleRows: any = await query(`
      SELECT
        COALESCE(SUM(available_qty * unit_price), 0) as total_value,
        COALESCE(SUM(CASE WHEN status = 'expired' OR (expire_date IS NOT NULL AND expire_date < CURDATE()) THEN available_qty * unit_price ELSE 0 END), 0) as expired_value,
        COALESCE(SUM(CASE WHEN status = 'frozen' THEN available_qty * unit_price ELSE 0 END), 0) as frozen_value,
        COALESCE(SUM(CASE WHEN expire_date IS NOT NULL AND DATEDIFF(expire_date, CURDATE()) BETWEEN 0 AND 30 AND status = 'normal' THEN available_qty * unit_price ELSE 0 END), 0) as near_expiry_value
      FROM inv_inventory_batch
      WHERE deleted = 0
    `);

    staleInventoryRate.totalInventoryValue = Number(staleRows[0]?.total_value || 0);
    staleInventoryRate.expiredValue = Number(staleRows[0]?.expired_value || 0);
    staleInventoryRate.frozenValue = Number(staleRows[0]?.frozen_value || 0);
    staleInventoryRate.nearExpiryValue = Number(staleRows[0]?.near_expiry_value || 0);
    staleInventoryRate.staleValue = staleInventoryRate.expiredValue + staleInventoryRate.frozenValue;
    staleInventoryRate.rate = staleInventoryRate.totalInventoryValue > 0
      ? Math.round((staleInventoryRate.staleValue / staleInventoryRate.totalInventoryValue) * 10000) / 100
      : 0;
  } catch (e) { console.error('Stale inventory rate calc failed:', e); }

  // ========================================
  // 15. OEE 六大损失分类
  //     数据来源: 设备故障/设置调整/闲置/小停机/速度损失/废品
  // ========================================
  let oeeLossAnalysis: any = { breakdownLoss: 0, setupLoss: 0, idleLoss: 0, minorStopLoss: 0, speedLoss: 0, defectLoss: 0 };
  try {
    const lossRows: any = await query(`
      SELECT
        COALESCE(SUM(CASE WHEN current_status = 4 THEN 1 ELSE 0 END), 0) as breakdown_count,
        COUNT(DISTINCT CASE WHEN process_name IN ('模切', '丝印印刷') THEN work_order_id END) as setup_count,
        COALESCE(SUM(CASE WHEN current_status = 2 THEN 1 ELSE 0 END), 0) as idle_count
      FROM prd_work_report wr
      LEFT JOIN eqp_equipment e ON 1=1
      WHERE wr.deleted = 0 ${dateFilter}
    `, params);

    oeeLossAnalysis.breakdownLoss = Number(lossRows[0]?.breakdown_count || 0);
    oeeLossAnalysis.setupLoss = Number(lossRows[0]?.setup_count || 0);
    oeeLossAnalysis.idleLoss = Number(lossRows[0]?.idle_count || 0);
  } catch (e) { console.error('OEE loss analysis calc failed:', e); }

  return successResponse({
    otd,
    inventoryTurnover,
    oee,
    qualityRate,
    supplierScores,
    customerCredit,
    fifoCompliance,
    departmentEfficiency,
    inkConsumptionRate,
    paperUtilizationRate,
    surplusInkReuseRate,
    setupTime,
    ftq,
    staleInventoryRate,
    oeeLossAnalysis,
    period,
    generatedAt: new Date().toISOString(),
  });
});
