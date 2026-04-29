import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  withErrorHandler,
} from '@/lib/api-response';

// 仓库分类关联接口
interface WarehouseCategoryLink {
  id: number;
  code: string;
  name: string;
  warehouse_type: number;
  category_id: number;
  category_name?: string;
}

// POST - 初始化仓库分类关联
export const POST = withErrorHandler(async (request: NextRequest) => {
  // 使用事务处理字段添加和数据更新
  await transaction(async (connection) => {
    // 直接添加 category_id 字段（如果不存在会报错，但我们可以忽略）
    try {
      await connection.execute(`
        ALTER TABLE inv_warehouse
        ADD COLUMN category_id INT UNSIGNED DEFAULT NULL COMMENT '仓库分类ID' AFTER id,
        ADD KEY idx_category_id (category_id)
      `);
    } catch (e) {
      // 字段可能已存在，忽略错误
    }

    // 更新现有仓库数据，根据 warehouse_type 分配分类
    // 原材料仓 (ID=1): warehouse_type = 1
    await connection.execute(
      `UPDATE inv_warehouse SET category_id = 1 WHERE warehouse_type = 1`
    );

    // 半成品仓 (ID=2): warehouse_type = 2
    await connection.execute(
      `UPDATE inv_warehouse SET category_id = 2 WHERE warehouse_type = 2`
    );

    // 成品仓 (ID=3): warehouse_type = 3
    await connection.execute(
      `UPDATE inv_warehouse SET category_id = 3 WHERE warehouse_type = 3`
    );

    // 辅料仓 (ID=4): warehouse_type = 4
    await connection.execute(
      `UPDATE inv_warehouse SET category_id = 4 WHERE warehouse_type = 4`
    );
  });

  // 查询更新后的数据
  const warehouses = await query<WarehouseCategoryLink>(`
    SELECT w.id, w.warehouse_code as code, w.warehouse_name as name,
           w.warehouse_type, w.category_id, wc.name as category_name
    FROM inv_warehouse w
    LEFT JOIN sys_warehouse_category wc ON w.category_id = wc.id
    WHERE w.deleted = 0
    ORDER BY w.id
  `);

  // 统计信息
  const stats = {
    total: warehouses.length,
    withCategory: warehouses.filter((w) => w.category_id).length,
    withoutCategory: warehouses.filter((w) => !w.category_id).length,
  };

  return successResponse(
    {
      data: warehouses,
      stats,
    },
    '仓库分类关联初始化成功'
  );
}, '初始化仓库分类关联失败');

// GET - 获取当前仓库分类关联状态
export const GET = withErrorHandler(async (request: NextRequest) => {
  // 检查 category_id 字段是否存在
  const columnExists = await queryOne<{ count: number }>(`
    SELECT COUNT(*) as count FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'inv_warehouse'
    AND column_name = 'category_id'
  `);

  const hasCategoryField = columnExists ? columnExists.count > 0 : false;

  // 查询仓库分类关联状态
  const warehouses = await query<WarehouseCategoryLink>(`
    SELECT w.id, w.warehouse_code as code, w.warehouse_name as name,
           w.warehouse_type, w.category_id, wc.name as category_name
    FROM inv_warehouse w
    LEFT JOIN sys_warehouse_category wc ON w.category_id = wc.id
    WHERE w.deleted = 0
    ORDER BY w.id
  `);

  // 统计信息
  const stats = {
    total: warehouses.length,
    withCategory: warehouses.filter((w) => w.category_id).length,
    withoutCategory: warehouses.filter((w) => !w.category_id).length,
    hasCategoryField,
  };

  return successResponse({
    data: warehouses,
    stats,
    initialized: hasCategoryField && stats.withCategory > 0,
  });
}, '获取仓库分类关联状态失败');
