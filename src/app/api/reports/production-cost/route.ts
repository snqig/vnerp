import { getTranslations } from 'next-intl/server';

;
﻿import { NextRequest } from 'next/server';
import { query, SqlValue } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';

/**
 * 生产成本汇总报表
 * 标准成本 vs 实际成本对比
 */
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const groupBy = searchParams.get('groupBy') || 'workshop'; // workshop, product

  let dateFilter = '';
  const params: SqlValue[] = [];

  if (startDate && endDate) {
    dateFilter = ' AND wo.work_order_date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  if (groupBy === 'workshop') {
    // 按车间统计
    const rows = await query(
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
      FROM prod_work_order wo
      WHERE wo.deleted = 0 AND wo.status >= 2 ${dateFilter}
      GROUP BY wo.workshop
      ORDER BY total_actual_cost DESC`,
      params
    );

    const result = rows.map((row) => {
      const standardCost = parseFloat(String(row.total_standard_cost)) || 0;
      const actualCost = parseFloat(String(row.total_actual_cost)) || 0;
      const costVariance = actualCost - standardCost;
      const costVarianceRate =
        standardCost > 0 ? Math.round((costVariance / standardCost) * 100) : 0;

      return {
        workshop: String(row.workshop ?? ''),
        workOrderCount: Number(row.work_order_count ?? 0),
        planQty: parseFloat(String(row.total_plan_qty)),
        completedQty: parseFloat(String(row.total_completed_qty)),
        standardCost,
        actualCost,
        materialCost: parseFloat(String(row.total_material_cost)),
        laborCost: parseFloat(String(row.total_labor_cost)),
        overheadCost: parseFloat(String(row.total_overhead_cost)),
        costVariance,
        costVarianceRate,
      };
    });

    return successResponse(
      {
        list: result,
        summary: {
          totalWorkOrders: result.reduce((sum, r) => sum + Number(r.workOrderCount ?? 0), 0),
          totalStandardCost: result.reduce((sum, r) => sum + Number(r.standardCost ?? 0), 0),
          totalActualCost: result.reduce((sum, r) => sum + Number(r.actualCost ?? 0), 0),
          totalVariance: result.reduce((sum, r) => sum + Number(r.costVariance ?? 0), 0),
          avgVarianceRate:
            result.length > 0
              ? Math.round(
                  result.reduce((sum, r) => sum + Number(r.costVarianceRate ?? 0), 0) / result.length
                )
              : 0,
        },
      },
      ts('k_isoql6')
    );
  } else {
    // 按产品统计
    const rows = await query(
      `SELECT
        wo.material_id,
        m.material_code,
        m.material_name,
        COUNT(*) as work_order_count,
        COALESCE(SUM(wo.plan_qty), 0) as total_plan_qty,
        COALESCE(SUM(wo.completed_qty), 0) as total_completed_qty,
        COALESCE(SUM(wo.standard_cost), 0) as total_standard_cost,
        COALESCE(SUM(wo.actual_cost), 0) as total_actual_cost
      FROM prod_work_order wo
      LEFT JOIN material m ON wo.material_id = m.id
      WHERE wo.deleted = 0 AND wo.status >= 2 ${dateFilter}
      GROUP BY wo.material_id, m.material_code, m.material_name
      ORDER BY total_actual_cost DESC
      LIMIT 50`,
      params
    );

    const result = rows.map((row) => {
      const standardCost = parseFloat(String(row.total_standard_cost)) || 0;
      const actualCost = parseFloat(String(row.total_actual_cost)) || 0;
      const costVariance = actualCost - standardCost;
      const costVarianceRate =
        standardCost > 0 ? Math.round((costVariance / standardCost) * 100) : 0;
      const unitStandardCost =
        Number(row.total_plan_qty ?? 0) > 0 ? standardCost / parseFloat(String(row.total_plan_qty)) : 0;
      const unitActualCost =
        Number(row.total_completed_qty ?? 0) > 0
          ? actualCost / parseFloat(String(row.total_completed_qty))
          : 0;

      return {
        materialId: Number(row.material_id ?? 0),
        materialCode: String(row.material_code ?? ''),
        materialName: String(row.material_name ?? ''),
        workOrderCount: Number(row.work_order_count ?? 0),
        planQty: parseFloat(String(row.total_plan_qty)),
        completedQty: parseFloat(String(row.total_completed_qty)),
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
          totalStandardCost: result.reduce((sum, r) => sum + Number(r.standardCost ?? 0), 0),
          totalActualCost: result.reduce((sum, r) => sum + Number(r.actualCost ?? 0), 0),
          totalVariance: result.reduce((sum, r) => sum + Number(r.costVariance ?? 0), 0),
        },
      },
      ts('k_3cso4o')
    );
  }
});
