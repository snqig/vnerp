import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody,
} from '@/lib/api-response';

// 菜单数据接口
interface Menu {
  id?: number;
  parent_id?: number;
  menu_name: string;
  menu_code: string;
  menu_type?: number;
  icon?: string;
  path?: string;
  component?: string;
  permission?: string;
  sort_order?: number;
  is_visible?: number;
  status?: number;
  create_time?: string;
  update_time?: string;
}

// GET - 获取所有菜单
export const GET = withErrorHandler(async (request: NextRequest) => {
  const menus = await query<Menu>(`
    SELECT
      id, parent_id, menu_name, menu_code, menu_type, icon,
      path, component, permission, sort_order, is_visible, status,
      create_time, update_time
    FROM sys_menu
    WHERE status = 1
    ORDER BY sort_order ASC, id ASC
  `);

  return successResponse(menus);
}, '获取菜单失败');

// POST - 创建菜单
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body: Menu = await request.json();

  // 验证必填字段
  const validation = validateRequestBody(body, ['menu_name', 'menu_code']);

  if (!validation.valid) {
    return errorResponse(
      `缺少必填字段: ${validation.missing.join(', ')}`,
      400,
      400
    );
  }

  // 检查菜单编码是否已存在
  const existing = await queryOne<{ id: number }>(
    'SELECT id FROM sys_menu WHERE menu_code = ?',
    [body.menu_code]
  );

  if (existing) {
    return errorResponse('菜单编码已存在', 409, 409);
  }

  const result = await execute(
    `INSERT INTO sys_menu (
      parent_id, menu_name, menu_code, menu_type, icon, path,
      component, permission, sort_order, is_visible, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      body.parent_id ?? 0,
      body.menu_name,
      body.menu_code,
      body.menu_type ?? 1,
      body.icon ?? null,
      body.path ?? null,
      body.component ?? null,
      body.permission ?? null,
      body.sort_order ?? 0,
      body.is_visible ?? 1,
    ]
  );

  return successResponse({ id: result.insertId }, '菜单创建成功');
}, '创建菜单失败');

// PUT - 更新菜单
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body: Menu = await request.json();
  const { id } = body;

  if (!id) {
    return commonErrors.badRequest('菜单ID不能为空');
  }

  // 验证必填字段
  const validation = validateRequestBody(body, ['menu_name', 'menu_code']);

  if (!validation.valid) {
    return errorResponse(
      `缺少必填字段: ${validation.missing.join(', ')}`,
      400,
      400
    );
  }

  // 检查菜单是否存在
  const existingMenu = await queryOne<{ id: number }>(
    'SELECT id FROM sys_menu WHERE id = ?',
    [id]
  );

  if (!existingMenu) {
    return commonErrors.notFound('菜单不存在');
  }

  // 检查编码是否已被其他菜单使用
  const codeExists = await queryOne<{ id: number }>(
    'SELECT id FROM sys_menu WHERE menu_code = ? AND id != ?',
    [body.menu_code, id]
  );

  if (codeExists) {
    return errorResponse('菜单编码已存在', 409, 409);
  }

  const result = await execute(
    `UPDATE sys_menu SET
      parent_id = ?, menu_name = ?, menu_code = ?, menu_type = ?,
      icon = ?, path = ?, component = ?, permission = ?,
      sort_order = ?, is_visible = ?, status = ?
    WHERE id = ?`,
    [
      body.parent_id ?? 0,
      body.menu_name,
      body.menu_code,
      body.menu_type ?? 1,
      body.icon ?? null,
      body.path ?? null,
      body.component ?? null,
      body.permission ?? null,
      body.sort_order ?? 0,
      body.is_visible ?? 1,
      body.status ?? 1,
      id,
    ]
  );

  if (result.affectedRows === 0) {
    return commonErrors.notFound('菜单不存在');
  }

  return successResponse(null, '菜单更新成功');
}, '更新菜单失败');

// DELETE - 删除菜单
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return commonErrors.badRequest('菜单ID不能为空');
  }

  const menuId = parseInt(id);

  // 检查菜单是否存在
  const existingMenu = await queryOne<{ id: number }>(
    'SELECT id FROM sys_menu WHERE id = ?',
    [menuId]
  );

  if (!existingMenu) {
    return commonErrors.notFound('菜单不存在');
  }

  // 检查是否有子菜单
  const hasChildren = await queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM sys_menu WHERE parent_id = ?',
    [menuId]
  );

  if (hasChildren && hasChildren.count > 0) {
    return errorResponse('请先删除子菜单', 409, 409);
  }

  // 使用事务删除菜单和关联的角色权限
  await transaction(async (connection) => {
    // 删除角色菜单关联
    await connection.execute(
      'DELETE FROM sys_role_menu WHERE menu_id = ?',
      [menuId]
    );

    // 删除菜单
    await connection.execute(
      'DELETE FROM sys_menu WHERE id = ?',
      [menuId]
    );
  });

  return successResponse(null, '菜单删除成功');
}, '删除菜单失败');
