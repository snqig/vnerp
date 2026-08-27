import { NextRequest } from 'next/server';
import { query, execute, queryOne, SqlValue } from '@/lib/db';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import {
  getCategoryRules,
  validateCategoryForCreate,
  validateCategoryForUpdate,
} from '@/lib/category-validation';

interface WarehouseCategory {
  id?: number;
  code: string;
  name: string;
  description?: string;
  sort_order?: number;
  status?: number;
  create_time?: string;
  update_time?: string;
}

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status');
  // 以分类编码为主查询维度（前缀匹配）
  const categoryCode = searchParams.get('categoryCode') || searchParams.get('code') || '';

  let sql = `
    SELECT id, code, name, description, sort_order, status, create_time, update_time
    FROM sys_warehouse_category
    WHERE deleted = 0
  `;
  const params: SqlValue[] = [];

  if (categoryCode) {
    sql += ' AND code LIKE ?';
    params.push(`${categoryCode}%`);
  }

  if (keyword) {
    sql += ' AND (name LIKE ? OR code LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (status !== null && status !== undefined && status !== '') {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY sort_order ASC, id ASC';

  const result = await query<WarehouseCategory>(sql, params);

  // 默认仍返回纯数组，保持既有调用方（入库页 useInboundData 等）兼容；
  // 需要规则的页面显式传 withRules=1 获取包装结构
  if (searchParams.get('withRules') !== '1') {
    return successResponse(result);
  }

  const rules = await getCategoryRules('warehouse');
  return successResponse({
    list: result,
    total: result.length,
    // 前端可据此渲染输入框占位符/校验提示，保证前后端用同一份系统设置
    rules: {
      codePattern: rules.codePattern,
      codePatternDesc: rules.codePatternDesc,
      maxDepth: rules.maxDepth,
      enforceOnCreate: rules.enforceOnCreate,
      enforceOnUpdate: rules.enforceOnUpdate,
    },
  });
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body: WarehouseCategory = await request.json();

    const name = (body.name ?? '').trim();
    if (!name) {
      return errorResponse('仓库分类名称不能为空', 400, 400);
    }

    // 统一校验：编码规则来自 sys_calc_param（迁移 074），不再散落在各路由
    const validation = await validateCategoryForCreate('warehouse', {
      code: body.code,
      status: body.status,
    });
    if (validation.blocked) {
      return errorResponse(validation.errors.join('；'), 400, 400);
    }

    const result = await execute(
      `INSERT INTO sys_warehouse_category (code, name, description, sort_order, status)
       VALUES (?, ?, ?, ?, ?)`,
      [
        String(body.code).trim(),
        name,
        body.description || '',
        body.sort_order ?? 0,
        body.status ?? 1,
      ]
    );

    return successResponse(
      { id: result.insertId, warnings: validation.warnings },
      validation.warnings.length > 0
        ? `仓库分类创建成功（注意：${validation.warnings.join('；')}）`
        : '仓库分类创建成功'
    );
  },
  { logTitle: '创建仓库分类' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body: WarehouseCategory = await request.json();
    const { id } = body;

    if (!id) {
      return commonErrors.badRequest('缺少分类ID');
    }

    const name = (body.name ?? '').trim();
    if (!name) {
      return errorResponse('仓库分类名称不能为空', 400, 400);
    }

    const existingCategory = await queryOne<{ id: number }>(
      'SELECT id FROM sys_warehouse_category WHERE id = ? AND deleted = 0',
      [id]
    );

    if (!existingCategory) {
      return commonErrors.notFound('仓库分类不存在');
    }

    // 编辑走宽松策略：编码不合规仅提示，不锁死存量数据；
    // 但唯一性冲突等真实完整性问题依然阻断
    const validation = await validateCategoryForUpdate('warehouse', {
      code: body.code,
      status: body.status,
      excludeId: Number(id),
    });
    if (validation.blocked) {
      return errorResponse(validation.errors.join('；'), 400, 400);
    }

    const result = await execute(
      `UPDATE sys_warehouse_category
          SET code = ?, name = ?, description = ?, sort_order = ?, status = ?
        WHERE id = ? AND deleted = 0`,
      [
        String(body.code ?? '').trim(),
        name,
        body.description || '',
        body.sort_order ?? 0,
        body.status ?? 1,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return commonErrors.notFound('仓库分类不存在');
    }

    return successResponse(
      { warnings: validation.warnings },
      validation.warnings.length > 0
        ? `仓库分类更新成功（注意：${validation.warnings.join('；')}）`
        : '仓库分类更新成功'
    );
  },
  { logTitle: '更新仓库分类' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return commonErrors.badRequest('缺少分类ID');
    }

    const categoryId = parseInt(id);
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return commonErrors.badRequest('分类ID非法');
    }

    const existingCategory = await queryOne<{ id: number }>(
      'SELECT id FROM sys_warehouse_category WHERE id = ? AND deleted = 0',
      [categoryId]
    );

    if (!existingCategory) {
      return commonErrors.notFound('仓库分类不存在');
    }

    const hasWarehouses = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM inv_warehouse WHERE category_id = ? AND deleted = 0',
      [categoryId]
    );

    if (hasWarehouses && Number(hasWarehouses.count) > 0) {
      return errorResponse(
        `该分类下有 ${hasWarehouses.count} 个仓库，请先调整仓库归属后再删除`,
        409,
        409
      );
    }

    // 软删除：与全库 deleted = 0 过滤保持一致，避免硬删后
    // inv_warehouse.category_id 变成悬空引用
    const result = await execute(
      'UPDATE sys_warehouse_category SET deleted = 1 WHERE id = ? AND deleted = 0',
      [categoryId]
    );

    if (result.affectedRows === 0) {
      return commonErrors.notFound('仓库分类不存在');
    }

    return successResponse(null, '仓库分类删除成功');
  },
  { logTitle: '删除仓库分类' }
);
