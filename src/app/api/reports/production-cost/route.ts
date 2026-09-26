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
    dateFilter = ' AND wo.plan_start_date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  if (groupBy === 'workshop') {
    // 按车间统计
    //
    // 修复（原 SQL 与真实库完全对不上，任何请求都 500）：
    //   - prod_work_order 无 workshop / plan_qty / standard_cost / actual_cost / material_cost 等列
    //   - status 是 varchar（pending/confirmed/producing/completed/cancelled），不能与数字比较
    //   - 真实成本列是 total_material_cost / total_labor_cost / total_tool_cost / total_overhead_cost / unit_cost
    //   - 车间口径用 warehouse_id 关联 inv_warehouse（输出仍名为 workshop，保持前端契约）
    const rows = await query(
      `SELECT
        w.warehouse_name as workshop,
        COUNT(*) as work_order_count,
        COALESCE(SUM(wo.planned_qty), 0) as total_plan_qty,
        COALESCE(SUM(wo.completed_qty), 0) as total_completed_qty,
        COALESCE(SUM(wo.unit_cost * wo.planned_qty), 0) as total_standard_cost,
        COALESCE(SUM(wo.total_material_cost + wo.total_labor_cost + wo.total_tool_cost + wo.total_overhead_cost), 0) as total_actual_cost,
        COALESCE(SUM(wo.total_material_cost), 0) as total_material_cost,
        COALESCE(SUM(wo.total_labor_cost), 0) as total_labor_cost,
        COALESCE(SUM(wo.total_overhead_cost), 0) as total_overhead_cost
      FROM prod_work_order wo
      LEFT JOIN inv_warehouse w ON w.id = wo.warehouse_id
      WHERE wo.deleted = 0 AND wo.status <> 'cancelled' ${dateFilter}
      GROUP BY w.warehouse_name
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
    // 修复：material 表不存在（物料在 inv_material），prod_work_order 也没有 plan_qty /
    // material_id —— 物料号列是 legacy_material_id；status 是 varchar 不能与数字比较。
    const rows = await query(
      `SELECT
        wo.legacy_material_id as material_id,
        m.material_code,
        m.material_name,
        COUNT(*) as work_order_count,
        COALESCE(SUM(wo.planned_qty), 0) as total_plan_qty,
        COALESCE(SUM(wo.completed_qty), 0) as total_completed_qty,
        COALESCE(SUM(wo.unit_cost * wo.planned_qty), 0) as total_standard_cost,
        COALESCE(SUM(wo.total_material_cost + wo.total_labor_cost + wo.total_tool_cost + wo.total_overhead_cost), 0) as total_actual_cost
      FROM prod_work_order wo
      LEFT JOIN inv_material m ON m.id = wo.legacy_material_id
      WHERE wo.deleted = 0 AND wo.status <> 'cancelled' ${dateFilter}
      GROUP BY wo.legacy_material_id, m.material_code, m.material_name
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
