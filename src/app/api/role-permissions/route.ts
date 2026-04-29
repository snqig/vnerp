import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody,
} from '@/lib/api-response';

// 角色权限接口
interface RolePermission {
  role_id: number;
  menu_id: number;
}

// GET - 获取角色权限
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const roleId = searchParams.get('roleId');

  if (!roleId) {
    return commonErrors.badRequest('角色ID不能为空');
  }

  const roleIdNum = parseInt(roleId);

  // 检查角色是否存在
  const existingRole = await queryOne<{ id: number }>(
    'SELECT id FROM sys_role WHERE id = ? AND deleted = 0',
    [roleIdNum]
  );

  if (!existingRole) {
    return commonErrors.notFound('角色不存在');
  }

  const result = await query<RolePermission>(
    'SELECT role_id, menu_id FROM sys_role_menu WHERE role_id = ?',
    [roleIdNum]
  );

  return successResponse(result);
}, '获取角色权限失败');

// POST - 保存角色权限
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { role_id, menu_ids } = body;

  // 验证必填字段
  const validation = validateRequestBody(body, ['role_id']);

  if (!validation.valid) {
    return errorResponse(
      `缺少必填字段: ${validation.missing.join(', ')}`,
      400,
      400
    );
  }

  const roleIdNum = parseInt(role_id);

  // 检查角色是否存在
  const existingRole = await queryOne<{ id: number }>(
    'SELECT id FROM sys_role WHERE id = ? AND deleted = 0',
    [roleIdNum]
  );

  if (!existingRole) {
    return commonErrors.notFound('角色不存在');
  }

  // 使用事务保存权限
  await transaction(async (connection) => {
    // 删除该角色原有的权限
    await connection.execute(
      'DELETE FROM sys_role_menu WHERE role_id = ?',
      [roleIdNum]
    );

    // 插入新的权限
    if (menu_ids && Array.isArray(menu_ids) && menu_ids.length > 0) {
      // 验证所有菜单ID是否有效
      const validMenuIds: number[] = [];
      for (const menuId of menu_ids) {
        const menu = await queryOne<{ id: number }>(
          'SELECT id FROM sys_menu WHERE id = ?',
          [parseInt(menuId)]
        );
        if (menu) {
          validMenuIds.push(parseInt(menuId));
        }
      }

      if (validMenuIds.length > 0) {
        const values = validMenuIds.map((menuId) => [roleIdNum, menuId]);
        await connection.query(
          'INSERT INTO sys_role_menu (role_id, menu_id) VALUES ?',
          [values]
        );
      }
    }
  });

  return successResponse(null, '权限设置成功');
}, '保存角色权限失败');
