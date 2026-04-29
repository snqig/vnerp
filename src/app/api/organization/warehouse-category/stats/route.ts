import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  withErrorHandler,
} from '@/lib/api-response';

// 仓库分类统计接口
interface CategoryStats {
  id: number;
  code: string;
  name: string;
  description?: string;
  sort_order: number;
  status: number;
  warehouse_count: number;
  active_warehouse_count: number;
  total_capacity: number;
  total_used_capacity: number;
}

// 总体统计接口
interface SummaryStats {
  total_categories: number;
  active_categories: number;
  total_warehouses: number;
  active_warehouses: number;
}

// GET - 获取仓库分类统计信息
export const GET = withErrorHandler(async (request: NextRequest) => {
  // 获取每个分类的仓库数量统计
  const stats = await query<CategoryStats>(`
    SELECT
      wc.id,
      wc.code,
      wc.name,
      wc.description,
      wc.sort_order,
      wc.status,
      COUNT(w.id) as warehouse_count,
      SUM(CASE WHEN w.status = 1 THEN 1 ELSE 0 END) as active_warehouse_count,
      0 as total_capacity,
      0 as total_used_capacity
    FROM sys_warehouse_category wc
    LEFT JOIN inv_warehouse w ON wc.id = w.category_id AND w.deleted = 0
    WHERE wc.deleted = 0
    GROUP BY wc.id, wc.code, wc.name, wc.description, wc.sort_order, wc.status
    ORDER BY wc.sort_order ASC
  `);

  // 获取总体统计
  const summary = await queryOne<SummaryStats>(`
    SELECT
      COUNT(*) as total_categories,
      SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active_categories,
      (SELECT COUNT(*) FROM inv_warehouse WHERE deleted = 0) as total_warehouses,
      (SELECT COUNT(*) FROM inv_warehouse WHERE deleted = 0 AND status = 1) as active_warehouses
    FROM sys_warehouse_category
    WHERE deleted = 0
  `);

  // 计算额外统计信息
  const categoryWithMostWarehouses = stats.reduce((max, curr) =>
    curr.warehouse_count > max.warehouse_count ? curr : max,
    stats[0] || null
  );

  const categoryWithNoWarehouses = stats.filter((s) => s.warehouse_count === 0);

  return successResponse({
    categories: stats,
    summary: summary || {
      total_categories: 0,
      active_categories: 0,
      total_warehouses: 0,
      active_warehouses: 0,
    },
    analysis: {
      categoryWithMostWarehouses: categoryWithMostWarehouses
        ? {
            id: categoryWithMostWarehouses.id,
            name: categoryWithMostWarehouses.name,
            count: categoryWithMostWarehouses.warehouse_count,
          }
        : null,
      emptyCategories: categoryWithNoWarehouses.map((c) => ({
        id: c.id,
        name: c.name,
      })),
      emptyCategoryCount: categoryWithNoWarehouses.length,
    },
  });
}, '获取仓库分类统计失败');
