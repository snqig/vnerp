import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const GET = withPermission(async (_request: NextRequest, _userInfo) => {
  const stats = await query(`
    SELECT
      wc.id,
      wc.code,
      wc.name,
      wc.description,
      wc.sort_order,
      wc.status,
      0 as warehouse_count,
      0 as active_warehouse_count,
      0 as total_capacity,
      0 as total_used_capacity
    FROM sys_warehouse_category wc
    ORDER BY wc.sort_order ASC
  `);

  const summary = await queryOne(`
    SELECT
      COUNT(*) as total_categories,
      SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active_categories,
      (SELECT COUNT(*) FROM inv_warehouse WHERE deleted = 0) as total_warehouses,
      (SELECT COUNT(*) FROM inv_warehouse WHERE status = 1 AND deleted = 0) as active_warehouses
    FROM sys_warehouse_category
  `);

  const categoryWithMostWarehouses = null;
  const categoryWithNoWarehouses = stats.map((c: Loose) => ({
    id: c.id,
    name: c.name,
  }));

  return successResponse({
    categories: stats,
    summary: summary || {
      total_categories: 0,
      active_categories: 0,
      total_warehouses: 0,
      active_warehouses: 0,
    },
    analysis: {
      categoryWithMostWarehouses,
      emptyCategories: categoryWithNoWarehouses,
      emptyCategoryCount: categoryWithNoWarehouses.length,
    },
  });
});
