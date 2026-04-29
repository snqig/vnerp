import { NextRequest } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody,
} from '@/lib/api-response';

// 按钮权限接口
interface ButtonPermission {
  code: string;
  name: string;
}

// GET - 获取角色的按钮权限
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const roleId = searchParams.get('roleId');

  if (!roleId) {
    return commonErrors.badRequest('角色ID不能为空');
  }

  const roleIdNum = parseInt(roleId);

  // 检查角色是否存在
  const existingRole = await queryOne<{ id: number; permissions: string | null }>(
    'SELECT id, permissions FROM sys_role WHERE id = ? AND deleted = 0',
    [roleIdNum]
  );

  if (!existingRole) {
    return commonErrors.notFound('角色不存在');
  }

  const permissions: ButtonPermission[] = existingRole.permissions
    ? JSON.parse(existingRole.permissions)
    : [];

  return successResponse(permissions);
}, '获取按钮权限失败');

// POST - 保存角色的按钮权限
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { role_id, permissions } = body;

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

  // 验证权限格式
  if (permissions && !Array.isArray(permissions)) {
    return errorResponse('权限格式不正确，应为数组', 400, 400);
  }

  // 更新角色权限
  const result = await execute(
    'UPDATE sys_role SET permissions = ? WHERE id = ?',
    [JSON.stringify(permissions || []), roleIdNum]
  );

  if (result.affectedRows === 0) {
    return commonErrors.notFound('角色不存在');
  }

  return successResponse(null, '按钮权限保存成功');
}, '保存按钮权限失败');
