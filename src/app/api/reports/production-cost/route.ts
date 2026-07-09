import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

/**
 * 生产成本汇总报表
 * 标准成本 vs 实际成本对比
 */
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const groupBy = searchParams.get('groupBy') || 'workshop'; // workshop, product

  let dateFilter = '';
  const params: Loose[] = [];

  if (startDate && endDate) {
    dateFilter = ' AND wo.work_order_date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  if (groupBy === 'workshop') {
    // 按车间统计
    const rows: Loose = await query(
      `SELECT
        wo.workshop,
        COUNT(*) as work_order_count,
        COALESCE(SUM(wo.plan_qty), 0) as total_plan_qty,
        COALESCE(SUM(wo.completed_qty), 0) as total_completed_qty,
        COALESCE(SUM(wo.standard_cost), 0) as total_standard_cost,
        COALESCE(SUM(wo.actual_cost), 0) as total_actual_cost,
        COALESCE(SUM(wo.material_cost), 0) as total_material_cost,
        COALESCE(SUM(wo.labor_cost), 0) as total_labor_cost,
        COALESCE(SUM(wo.overhead_cost), 0) as total_overhead_cost
      FROM prd_work_order wo
      WHERE wo.deleted = 0 AND wo.status >= 2 ${dateFilter}
      GROUP BY wo.workshop
      ORDER BY total_actual_cost DESC`,
      params
    );

    const result = rows.map((row: Loose) => {
      const standardCost = parseFloat(row.total_standard_cost) || 0;
      const actualCost = parseFloat(row.total_actual_cost) || 0;
      const costVariance = actualCost - standardCost;
      const costVarianceRate =
        standardCost > 0 ? Math.round((costVariance / standardCost) * 100) : 0;

      return {
        workshop: row.workshop || '未分配',
        workOrderCount: row.work_order_count,
        planQty: parseFloat(row.total_plan_qty),
        completedQty: parseFloat(row.total_completed_qty),
        standardCost,
        actualCost,
        materialCost: parseFloat(row.total_material_cost),
        laborCost: parseFloat(row.total_labor_cost),
        overheadCost: parseFloat(row.total_overhead_cost),
        costVariance,
        costVarianceRate,
      };
    });

    return successResponse(
      {
        list: result,
        summary: {
          totalWorkOrders: result.reduce((sum: number, r: Loose) => sum + r.workOrderCount, 0),
          totalStandardCost: result.reduce((sum: number, r: Loose) => sum + r.standardCost, 0),
          totalActualCost: result.reduce((sum: number, r: Loose) => sum + r.actualCost, 0),
          totalVariance: result.reduce((sum: number, r: Loose) => sum + r.costVariance, 0),
          avgVarianceRate:
            result.length > 0
              ? Math.round(
                  result.reduce((sum: number, r: Loose) => sum + r.costVarianceRate, 0) /
                    result.length
                )
              : 0,
        },
      },
      '获取车间成本报表成功'
    );
  } else {
    // 按产品统计
    const rows: Loose = await query(
      `SELECT
        wo.material_id,
        m.material_code,
        m.material_name,
        COUNT(*) as work_order_count,
        COALESCE(SUM(wo.plan_qty), 0) as total_plan_qty,
        COALESCE(SUM(wo.completed_qty), 0) as total_completed_qty,
        COALESCE(SUM(wo.standard_cost), 0) as total_standard_cost,
        COALESCE(SUM(wo.actual_cost), 0) as total_actual_cost
      FROM prd_work_order wo
      LEFT JOIN material m ON wo.material_id = m.id
      WHERE wo.deleted = 0 AND wo.status >= 2 ${dateFilter}
      GROUP BY wo.material_id, m.material_code, m.material_name
      ORDER BY total_actual_cost DESC
      LIMIT 50`,
      params
    );

    const result = rows.map((row: Loose) => {
      const standardCost = parseFloat(row.total_standard_cost) || 0;
      const actualCost = parseFloat(row.total_actual_cost) || 0;
      const costVariance = actualCost - standardCost;
      const costVarianceRate =
        standardCost > 0 ? Math.round((costVariance / standardCost) * 100) : 0;
      const unitStandardCost =
        row.total_plan_qty > 0 ? standardCost / parseFloat(row.total_plan_qty) : 0;
      const unitActualCost =
        row.total_completed_qty > 0 ? actualCost / parseFloat(row.total_completed_qty) : 0;

      return {
        materialId: row.material_id,
        materialCode: row.material_code || '未知',
        materialName: row.material_name || '未知产品',
        workOrderCount: row.work_order_count,
        planQty: parseFloat(row.total_plan_qty),
        completedQty: parseFloat(row.total_completed_qty),
        standardCost,
        actualCost,
        unitStandardCost: Math.round(unitStandardCost * 100) / 100,
        unitActualCost: Math.round(unitActualCost * 100) / 100,
        costVariance,
        costVarianceRate,
      };
    });

    return successResponse(
      {
        list: result,
        summary: {
          totalProducts: result.length,
          totalStandardCost: result.reduce((sum: number, r: Loose) => sum + r.standardCost, 0),
          totalActualCost: result.reduce((sum: number, r: Loose) => sum + r.actualCost, 0),
          totalVariance: result.reduce((sum: number, r: Loose) => sum + r.costVariance, 0),
        },
      },
      '获取产品成本报表成功'
    );
  }
});
