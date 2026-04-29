import { NextRequest } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody,
} from '@/lib/api-response';

// 角色数据接口
interface Role {
  id?: number;
  role_code: string;
  role_name: string;
  description?: string;
  data_scope?: number;
  status?: number;
  permissions?: string | string[];
  create_time?: string;
  update_time?: string;
}

// 构建查询条件
function buildQueryConditions(params: {
  keyword: string;
  status: string | null;
}): { sql: string; values: any[] } {
  let sql = `
    SELECT
      id, role_code, role_name, description, data_scope, status, permissions,
      create_time, update_time
    FROM sys_role
    WHERE deleted = 0
  `;
  const values: any[] = [];

  if (params.keyword) {
    sql += ' AND (role_name LIKE ? OR role_code LIKE ?)';
    const likeKeyword = `%${params.keyword}%`;
    values.push(likeKeyword, likeKeyword);
  }

  if (params.status !== undefined && params.status !== null && params.status !== '') {
    sql += ' AND status = ?';
    values.push(parseInt(params.status));
  }

  sql += ' ORDER BY id ASC';

  return { sql, values };
}

// 格式化角色数据
function formatRole(role: any): Role {
  let permissions: string[] = [];
  if (role.permissions) {
    try {
      if (typeof role.permissions === 'string') {
        // 尝试解析JSON字符串
        const parsed = JSON.parse(role.permissions);
        permissions = Array.isArray(parsed) ? parsed : [parsed];
      } else if (Array.isArray(role.permissions)) {
        // 如果已经是数组
        permissions = role.permissions;
      }
    } catch {
      // 如果不是JSON，可能是逗号分隔的字符串
      if (typeof role.permissions === 'string') {
        permissions = role.permissions.split(',').filter((p: string) => p.trim());
      }
    }
  }
  return {
    ...role,
    code: role.role_code,
    name: role.role_name,
    permissions,
  };
}

// GET - 获取角色列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status');

  const { sql, values } = buildQueryConditions({
    keyword,
    status,
  });

  const roles = await query<Role>(sql, values);
  const formattedRoles = (roles as any[]).map(formatRole);

  return successResponse(formattedRoles);
}, '获取角色列表失败');

// POST - 创建角色
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body: Role = await request.json();

  // 验证必填字段
  const validation = validateRequestBody(body, ['role_code', 'role_name']);

  if (!validation.valid) {
    return errorResponse(
      `缺少必填字段: ${validation.missing.join(', ')}`,
      400,
      400
    );
  }

  // 检查编码是否已存在
  const existing = await queryOne<{ id: number }>(
    'SELECT id FROM sys_role WHERE role_code = ? AND deleted = 0',
    [body.role_code]
  );

  if (existing) {
    return errorResponse('角色编码已存在', 409, 409);
  }

  const permissions =
    typeof body.permissions === 'object'
      ? JSON.stringify(body.permissions)
      : body.permissions;

  const result = await execute(
    `INSERT INTO sys_role (role_code, role_name, description, data_scope, status, permissions)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      body.role_code,
      body.role_name,
      body.description ?? null,
      body.data_scope ?? 1,
      body.status ?? 1,
      permissions ?? null,
    ]
  );

  return successResponse({ id: result.insertId }, '角色创建成功');
}, '创建角色失败');

// PUT - 更新角色
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body: Role = await request.json();
  const { id } = body;

  if (!id) {
    return commonErrors.badRequest('角色ID不能为空');
  }

  // 验证必填字段
  const validation = validateRequestBody(body, ['role_name']);

  if (!validation.valid) {
    return errorResponse(
      `缺少必填字段: ${validation.missing.join(', ')}`,
      400,
      400
    );
  }

  // 检查角色是否存在
  const existingRole = await queryOne<{ id: number }>(
    'SELECT id FROM sys_role WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!existingRole) {
    return commonErrors.notFound('角色不存在');
  }

  const permissions =
    typeof body.permissions === 'object'
      ? JSON.stringify(body.permissions)
      : body.permissions;

  const result = await execute(
    `UPDATE sys_role SET
      role_name = ?,
      description = ?,
      data_scope = ?,
      status = ?,
      permissions = ?
    WHERE id = ? AND deleted = 0`,
    [
      body.role_name,
      body.description ?? null,
      body.data_scope ?? 1,
      body.status ?? 1,
      permissions ?? null,
      id,
    ]
  );

  if (result.affectedRows === 0) {
    return commonErrors.notFound('角色不存在');
  }

  return successResponse(null, '角色更新成功');
}, '更新角色失败');

// DELETE - 删除角色（软删除）
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return commonErrors.badRequest('角色ID不能为空');
  }

  const roleId = parseInt(id);

  // 检查角色是否存在
  const existingRole = await queryOne<{ id: number }>(
    'SELECT id FROM sys_role WHERE id = ? AND deleted = 0',
    [roleId]
  );

  if (!existingRole) {
    return commonErrors.notFound('角色不存在');
  }

  // 检查是否有用户关联此角色
  const hasUsers = await queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM sys_user_role WHERE role_id = ?',
    [roleId]
  );

  if (hasUsers && hasUsers.count > 0) {
    return errorResponse('该角色已分配给用户，无法删除', 409, 409);
  }

  await execute('UPDATE sys_role SET deleted = 1 WHERE id = ?', [roleId]);

  return successResponse(null, '角色删除成功');
}, '删除角色失败');
