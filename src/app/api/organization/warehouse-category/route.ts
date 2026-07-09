import { NextRequest } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  validateRequestBody,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

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

  let sql = `
    SELECT id, code, name, description, sort_order, status, create_time, update_time
    FROM sys_warehouse_category
    WHERE 1=1
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
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body: WarehouseCategory = await request.json();

    const validation = validateRequestBody(body, ['code', 'name']);
    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    const existing = await queryOne<{ id: number }>(
      'SELECT id FROM sys_warehouse_category WHERE code = ?',
      [body.code]
    );

    if (existing) {
      return errorResponse('分类编码已存在', 409, 409);
    }

    const result = await execute(
      `INSERT INTO sys_warehouse_category (code, name, description, sort_order, status) VALUES (?, ?, ?, ?, ?)`,
      [body.code, body.name, body.description || '', body.sort_order ?? 0, body.status ?? 1]
    );

    return successResponse({ id: result.insertId }, '仓库分类创建成功');
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

    const validation = validateRequestBody(body, ['code', 'name']);
    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    const existingCategory = await queryOne<{ id: number }>(
      'SELECT id FROM sys_warehouse_category WHERE id = ?',
      [id]
    );

    if (!existingCategory) {
      return commonErrors.notFound('仓库分类不存在');
    }

    const codeExists = await queryOne<{ id: number }>(
      'SELECT id FROM sys_warehouse_category WHERE code = ? AND id != ?',
      [body.code, id]
    );

    if (codeExists) {
      return errorResponse('分类编码已存在', 409, 409);
    }

    const result = await execute(
      `UPDATE sys_warehouse_category SET code = ?, name = ?, description = ?, sort_order = ?, status = ? WHERE id = ?`,
      [body.code, body.name, body.description || '', body.sort_order ?? 0, body.status ?? 1, id]
    );

    if (result.affectedRows === 0) {
      return commonErrors.notFound('仓库分类不存在');
    }

    return successResponse(null, '仓库分类更新成功');
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

    const existingCategory = await queryOne<{ id: number }>(
      'SELECT id FROM sys_warehouse_category WHERE id = ?',
      [categoryId]
    );

    if (!existingCategory) {
      return commonErrors.notFound('仓库分类不存在');
    }

    const hasWarehouses = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM inv_warehouse WHERE category_id = ?',
      [categoryId]
    );

    if (hasWarehouses && hasWarehouses.count > 0) {
      return errorResponse('该分类下有仓库，无法删除', 409, 409);
    }

    const result = await execute('DELETE FROM sys_warehouse_category WHERE id = ?', [categoryId]);

    if (result.affectedRows === 0) {
      return commonErrors.notFound('仓库分类不存在');
    }

    return successResponse(null, '仓库分类删除成功');
  },
  { logTitle: '删除仓库分类' }
);
