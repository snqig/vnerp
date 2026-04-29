import { NextRequest } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody,
} from '@/lib/api-response';

// 仓库分类接口
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

// GET - 获取仓库分类列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status');

  let sql = `
    SELECT id, code, name, description, sort_order, status, create_time, update_time
    FROM sys_warehouse_category
    WHERE deleted = 0
  `;
  const params: any[] = [];

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

  return successResponse(result);
}, '获取仓库分类列表失败');

// POST - 创建仓库分类
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body: WarehouseCategory = await request.json();

  // 验证必填字段
  const validation = validateRequestBody(body, ['code', 'name']);

  if (!validation.valid) {
    return errorResponse(
      `缺少必填字段: ${validation.missing.join(', ')}`,
      400,
      400
    );
  }

  // 检查编码是否已存在
  const existing = await queryOne<{ id: number }>(
    'SELECT id FROM sys_warehouse_category WHERE code = ? AND deleted = 0',
    [body.code]
  );

  if (existing) {
    return errorResponse('分类编码已存在', 409, 409);
  }

  const result = await execute(
    `
      INSERT INTO sys_warehouse_category (code, name, description, sort_order, status)
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      body.code,
      body.name,
      body.description || '',
      body.sort_order ?? 0,
      body.status ?? 1,
    ]
  );

  return successResponse({ id: result.insertId }, '仓库分类创建成功');
}, '创建仓库分类失败');

// PUT - 更新仓库分类
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body: WarehouseCategory = await request.json();
  const { id } = body;

  if (!id) {
    return commonErrors.badRequest('缺少分类ID');
  }

  // 验证必填字段
  const validation = validateRequestBody(body, ['code', 'name']);

  if (!validation.valid) {
    return errorResponse(
      `缺少必填字段: ${validation.missing.join(', ')}`,
      400,
      400
    );
  }

  // 检查分类是否存在
  const existingCategory = await queryOne<{ id: number }>(
    'SELECT id FROM sys_warehouse_category WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!existingCategory) {
    return commonErrors.notFound('仓库分类不存在');
  }

  // 检查编码是否已被其他分类使用
  const codeExists = await queryOne<{ id: number }>(
    'SELECT id FROM sys_warehouse_category WHERE code = ? AND id != ? AND deleted = 0',
    [body.code, id]
  );

  if (codeExists) {
    return errorResponse('分类编码已存在', 409, 409);
  }

  const result = await execute(
    `
      UPDATE sys_warehouse_category
      SET code = ?, name = ?, description = ?, sort_order = ?, status = ?
      WHERE id = ?
    `,
    [
      body.code,
      body.name,
      body.description || '',
      body.sort_order ?? 0,
      body.status ?? 1,
      id,
    ]
  );

  if (result.affectedRows === 0) {
    return commonErrors.notFound('仓库分类不存在');
  }

  return successResponse(null, '仓库分类更新成功');
}, '更新仓库分类失败');

// DELETE - 删除仓库分类（软删除）
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return commonErrors.badRequest('缺少分类ID');
  }

  const categoryId = parseInt(id);

  // 检查分类是否存在
  const existingCategory = await queryOne<{ id: number }>(
    'SELECT id FROM sys_warehouse_category WHERE id = ? AND deleted = 0',
    [categoryId]
  );

  if (!existingCategory) {
    return commonErrors.notFound('仓库分类不存在');
  }

  // 检查是否有仓库使用此分类
  const hasWarehouses = await queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM sys_warehouse WHERE category_id = ? AND deleted = 0',
    [categoryId]
  );

  if (hasWarehouses && hasWarehouses.count > 0) {
    return errorResponse('该分类下有仓库，无法删除', 409, 409);
  }

  // 软删除
  const result = await execute(
    'UPDATE sys_warehouse_category SET deleted = 1 WHERE id = ?',
    [categoryId]
  );

  if (result.affectedRows === 0) {
    return commonErrors.notFound('仓库分类不存在');
  }

  return successResponse(null, '仓库分类删除成功');
}, '删除仓库分类失败');
