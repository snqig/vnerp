import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, withErrorHandler } from '@/lib/api-response';

// 仓库分类接口
interface WarehouseCategory {
  id: number;
  code: string;
  name: string;
  description?: string;
  sort_order?: number;
  status?: number;
}

// GET - 获取仓库分类列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const categories = await query<WarehouseCategory>(`
    SELECT
      id, code, name, description, sort_order, status
    FROM sys_warehouse_category
    WHERE deleted = 0 AND status = 1
    ORDER BY sort_order ASC, id ASC
  `);

  return successResponse(categories);
}, '获取仓库分类列表失败');
