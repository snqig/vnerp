import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const workOrderId = searchParams.get('work_order_id');
  const workOrderNo = searchParams.get('work_order_no');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const varianceType = searchParams.get('variance_type') || 'all';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  let where = 'WHERE wo.deleted = 0';
  const params: any[] = [];

  if (workOrderId) {
    where += ' AND wo.id = ?';
    params.push(parseInt(workOrderId));
  }
  if (workOrderNo) {
    where += ' AND wo.work_order_no LIKE ?';
    params.push(`%${workOrderNo}%`);
  }
  if (startDate) {
    where += ' AND wo.create_time >= ?';
    params.push(startDate);
  }
  if (endDate) {
    where += ' AND wo.create_time <= ?';
    params.push(endDate + ' 23:59:59');
  }

  const workOrders: any = await query(`
    SELECT
      wo.id,
      wo.work_order_no,
      wo.product_name,
      wo.quantity as plan_qty,
      wo.status,
      wo.create_time,
      soi.unit_price as sale_unit_price,
      soi.total_price as sale_total_price
    FROM prod_work_order wo
    LEFT JOIN sales_order_item soi ON wo.order_id = soi.order_id
    ${where}
    ORDER BY wo.create_time DESC
    LIMIT ? OFFSET ?
  `, [...params, pageSize, (page - 1) * pageSize]);

  const countResult: any = await query(`
    SELECT COUNT(*) as total FROM prod_work_order wo ${where}
  `, params);
  const total = countResult[0]?.total || 0;

  const varianceDetails: any[] = [];

  for (const wo of workOrders) {
    const materialCostRows: any = await query(`
      SELECT
        COALESCE(SUM(wr.completed_qty * bom.unit_price), 0) as standard_material_cost,
        COALESCE(SUM(tr.quantity * tr.unit_price), 0) as actual_material_cost
      FROM prd_work_report wr
      LEFT JOIN prod_work_order_item woi ON wr.work_order_id = woi.id
      LEFT JOIN (
        SELECT material_id, unit_price FROM prod_work_order_item WHERE work_order_id = ?
      ) bom ON 1=1
      LEFT JOIN inv_inventory_transaction tr ON tr.source_no = wo.work_order_no AND tr.trans_type = 'out'
      WHERE wr.work_order_id = ? AND wr.deleted = 0
    `, [wo.id, wo.id]);

    const laborCostRows: any = await query(`
      SELECT
        COALESCE(SUM(wr.work_hours), 0) as actual_work_hours,
        COALESCE(SUM(wr.qualified_qty), 0) as total_qualified
      FROM prd_work_report wr
      WHERE wr.work_order_id = ? AND wr.deleted = 0
    `, [wo.id]);

    const standardLaborRate = 50;
    const standardMaterialUnitCost = Number(wo.sale_unit_price || 0) * 0.45;

    const actualMaterialCost = Number(materialCostRows[0]?.actual_material_cost || 0);
    const standardMaterialCost = Number(wo.plan_qty || 0) * standardMaterialUnitCost;
    const materialVariance = standardMaterialCost - Math.abs(actualMaterialCost);

    const actualWorkHours = Number(laborCostRows[0]?.actual_work_hours || 0);
    const standardWorkHours = Number(wo.plan_qty || 0) / 500;
    const standardLaborCost = standardWorkHours * standardLaborRate;
    const actualLaborCost = actualWorkHours * standardLaborRate;
    const laborVariance = standardLaborCost - actualLaborCost;

    const overheadRate = 0.15;
    const standardOverheadCost = standardMaterialCost * overheadRate;
    const actualOverheadCost = Math.abs(actualMaterialCost) * overheadRate;
    const overheadVariance = standardOverheadCost - actualOverheadCost;

    const totalStandardCost = standardMaterialCost + standardLaborCost + standardOverheadCost;
    const totalActualCost = Math.abs(actualMaterialCost) + actualLaborCost + actualOverheadCost;
    const totalVariance = totalStandardCost - totalActualCost;

    const scrapRows: any = await query(`
      SELECT
        COALESCE(SUM(scrap_qty), 0) as total_scrap,
        COALESCE(SUM(completed_qty), 0) as total_completed
      FROM prd_work_report
      WHERE work_order_id = ? AND deleted = 0
    `, [wo.id]);

    const totalScrap = Number(scrapRows[0]?.total_scrap || 0);
    const totalCompleted = Number(scrapRows[0]?.total_completed || 0);
    const scrapRate = totalCompleted > 0 ? (totalScrap / (totalCompleted + totalScrap)) * 100 : 0;

    const detail: any = {
      work_order_id: wo.id,
      work_order_no: wo.work_order_no,
      product_name: wo.product_name,
      plan_qty: Number(wo.plan_qty || 0),
      status: wo.status,
      standard_cost: {
        material: Math.round(standardMaterialCost * 100) / 100,
        labor: Math.round(standardLaborCost * 100) / 100,
        overhead: Math.round(standardOverheadCost * 100) / 100,
        total: Math.round(totalStandardCost * 100) / 100,
      },
      actual_cost: {
        material: Math.round(Math.abs(actualMaterialCost) * 100) / 100,
        labor: Math.round(actualLaborCost * 100) / 100,
        overhead: Math.round(actualOverheadCost * 100) / 100,
        total: Math.round(totalActualCost * 100) / 100,
      },
      variance: {
        material: Math.round(materialVariance * 100) / 100,
        labor: Math.round(laborVariance * 100) / 100,
        overhead: Math.round(overheadVariance * 100) / 100,
        total: Math.round(totalVariance * 100) / 100,
        material_pct: standardMaterialCost > 0 ? Math.round((materialVariance / standardMaterialCost) * 10000) / 100 : 0,
        labor_pct: standardLaborCost > 0 ? Math.round((laborVariance / standardLaborCost) * 10000) / 100 : 0,
        total_pct: totalStandardCost > 0 ? Math.round((totalVariance / totalStandardCost) * 10000) / 100 : 0,
      },
      scrap_analysis: {
        total_scrap: totalScrap,
        total_completed: totalCompleted,
        scrap_rate: Math.round(scrapRate * 100) / 100,
        scrap_cost: Math.round(totalScrap * standardMaterialUnitCost * 100) / 100,
      },
      variance_reason: classifyVarianceReason(materialVariance, laborVariance, scrapRate),
    };

    if (varianceType === 'all' ||
        (varianceType === 'favorable' && totalVariance > 0) ||
        (varianceType === 'unfavorable' && totalVariance < 0) ||
        (varianceType === 'material' && Math.abs(materialVariance) > 0) ||
        (varianceType === 'labor' && Math.abs(laborVariance) > 0)) {
      varianceDetails.push(detail);
    }
  }

  const summaryResult: any = await query(`
    SELECT
      COALESCE(SUM(wr.completed_qty), 0) as total_completed_qty,
      COALESCE(SUM(wr.scrap_qty), 0) as total_scrap_qty,
      COALESCE(SUM(wr.work_hours), 0) as total_work_hours,
      COUNT(DISTINCT wr.work_order_id) as total_work_orders
    FROM prd_work_report wr
    WHERE wr.deleted = 0
  `);

  const overallSummary = {
    total_work_orders: Number(summaryResult[0]?.total_work_orders || 0),
    total_completed_qty: Number(summaryResult[0]?.total_completed_qty || 0),
    total_scrap_qty: Number(summaryResult[0]?.total_scrap_qty || 0),
    total_work_hours: Number(summaryResult[0]?.total_work_hours || 0),
    overall_scrap_rate: Number(summaryResult[0]?.total_completed_qty || 0) > 0
      ? Math.round((Number(summaryResult[0]?.total_scrap_qty || 0) / (Number(summaryResult[0]?.total_completed_qty || 0) + Number(summaryResult[0]?.total_scrap_qty || 0))) * 10000) / 100
      : 0,
  };

  return successResponse({
    list: varianceDetails,
    total,
    page,
    pageSize,
    summary: overallSummary,
  });
});

function classifyVarianceReason(materialVariance: number, laborVariance: number, scrapRate: number): string[] {
  const reasons: string[] = [];
  if (materialVariance < -100) reasons.push('材料超耗');
  if (materialVariance > 100) reasons.push('材料节约');
  if (laborVariance < -50) reasons.push('工时超支');
  if (laborVariance > 50) reasons.push('效率提升');
  if (scrapRate > 5) reasons.push('废品率偏高');
  if (scrapRate > 10) reasons.push('质量异常');
  if (reasons.length === 0) reasons.push('正常偏差');
  return reasons;
}
