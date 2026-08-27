import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { getCategoryRules, safeRegExp } from '@/lib/category-validation';

/**
 * 仓库分类统计
 *
 * 修复记录（本次）：
 *   原实现把 warehouse_count / active_warehouse_count 等字段全部硬编码为 0，
 *   前端「分类下仓库数」永远显示 0，「空分类」列表永远等于全部分类——
 *   这是一个纯装饰性的假统计。现改为对 inv_warehouse.category_id 做真实聚合，
 *   并额外返回编码不合规的分类清单，让系统设置里的编码规则在管理页可见。
 */

interface CategoryStatRow {
  id: number;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
  status: number;
  warehouse_count: number;
  active_warehouse_count: number;
}

export const GET = withPermission(async (_request: NextRequest, _userInfo) => {
  const stats = await query<CategoryStatRow>(`
    SELECT
      wc.id,
      wc.code,
      wc.name,
      wc.description,
      wc.sort_order,
      wc.status,
      COALESCE(w.warehouse_count, 0)        AS warehouse_count,
      COALESCE(w.active_warehouse_count, 0) AS active_warehouse_count,
      0 AS total_capacity,
      0 AS total_used_capacity
    FROM sys_warehouse_category wc
    LEFT JOIN (
      SELECT
        category_id,
        COUNT(*) AS warehouse_count,
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS active_warehouse_count
      FROM inv_warehouse
      WHERE deleted = 0 AND category_id IS NOT NULL
      GROUP BY category_id
    ) w ON w.category_id = wc.id
    WHERE wc.deleted = 0
    ORDER BY wc.sort_order ASC, wc.id ASC
  `);

  const summary = await queryOne(`
    SELECT
      COUNT(*) as total_categories,
      SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active_categories,
      (SELECT COUNT(*) FROM inv_warehouse WHERE deleted = 0) as total_warehouses,
      (SELECT COUNT(*) FROM inv_warehouse WHERE status = 1 AND deleted = 0) as active_warehouses
    FROM sys_warehouse_category
    WHERE deleted = 0
  `);

  const emptyCategories = stats
    .filter((c) => Number(c.warehouse_count) === 0)
    .map((c) => ({ id: c.id, code: c.code, name: c.name }));

  const categoryWithMostWarehouses =
    stats.length > 0
      ? stats.reduce((max, cur) =>
          Number(cur.warehouse_count) > Number(max.warehouse_count) ? cur : max
        )
      : null;

  // 把系统设置里的编码规则应用到列表上，让"哪些分类不合规"在管理页直接可见
  const rules = await getCategoryRules('warehouse');
  const re = safeRegExp(rules.codePattern);
  const invalidCodeCategories = re
    ? stats
        .filter((c) => !re.test(String(c.code ?? '')))
        .map((c) => ({ id: c.id, code: c.code, name: c.name }))
    : [];

  return successResponse({
    categories: stats,
    summary: summary || {
      total_categories: 0,
      active_categories: 0,
      total_warehouses: 0,
      active_warehouses: 0,
    },
    rules: {
      codePattern: rules.codePattern,
      codePatternDesc: rules.codePatternDesc,
      enforceOnCreate: rules.enforceOnCreate,
      enforceOnUpdate: rules.enforceOnUpdate,
    },
    analysis: {
      categoryWithMostWarehouses:
        categoryWithMostWarehouses && Number(categoryWithMostWarehouses.warehouse_count) > 0
          ? categoryWithMostWarehouses
          : null,
      emptyCategories,
      emptyCategoryCount: emptyCategories.length,
      invalidCodeCategories,
      invalidCodeCount: invalidCodeCategories.length,
    },
  });
});
