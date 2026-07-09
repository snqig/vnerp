import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';

export const GET = withPermission(async (request: NextRequest, _userInfo: UserInfo) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const withPermissions = searchParams.get('withPermissions') === 'true';

  const countResult: any = await query('SELECT COUNT(*) as total FROM sys_role WHERE deleted = 0');
  const total = countResult[0]?.total || 0;

  const rows: any = await query(
    `SELECT id, role_name, role_code, parent_id, inherit_mode, description, data_scope, status, permissions, create_time
     FROM sys_role WHERE deleted = 0 ORDER BY id LIMIT ? OFFSET ?`,
    [pageSize, (page - 1) * pageSize]
  );

  // 解析权限JSON
  const list = rows.map((row: any) => ({
    ...row,
    permissions:
      typeof row.permissions === 'string'
        ? JSON.parse(row.permissions || '[]')
        : row.permissions || [],
  }));

  // 如果需要继承权限，解析完整权限链
  if (withPermissions) {
    for (const role of list) {
      role.effectivePermissions = await resolveEffectivePermissions(role.id);
      role.parentRole = role.parent_id ? await getParentRoleName(role.parent_id) : null;
    }
  }

  return successResponse({ list, total, page, pageSize });
});

// 解析角色的有效权限（包含继承的权限）
async function resolveEffectivePermissions(
  roleId: number,
  visited = new Set<number>()
): Promise<string[]> {
  if (visited.has(roleId)) return []; // 防止循环继承
  visited.add(roleId);

  const role: any = await query(
    'SELECT id, parent_id, inherit_mode, permissions FROM sys_role WHERE id = ? AND deleted = 0',
    [roleId]
  );

  if (role.length === 0) return [];

  const currentPermissions =
    typeof role[0].permissions === 'string'
      ? JSON.parse(role[0].permissions || '[]')
      : role[0].permissions || [];

  if (!role[0].parent_id) {
    return currentPermissions;
  }

  const parentPermissions = await resolveEffectivePermissions(role[0].parent_id, visited);

  if (role[0].inherit_mode === 'override') {
    // 覆盖模式：仅使用自身权限
    return currentPermissions.length > 0 ? currentPermissions : parentPermissions;
  }

  // 合并模式：合并父权限和自身权限
  return [...new Set([...parentPermissions, ...currentPermissions])];
}

async function getParentRoleName(parentId: number): Promise<string | null> {
  const rows: any = await query('SELECT role_name FROM sys_role WHERE id = ? AND deleted = 0', [
    parentId,
  ]);
  return rows.length > 0 ? rows[0].role_name : null;
}

export const POST = withPermission(async (request: NextRequest, _userInfo: UserInfo) => {
  const body = await request.json();
  const {
    role_name,
    role_code,
    parent_id,
    inherit_mode,
    description,
    data_scope,
    status,
    permissions,
  } = body;

  if (!role_name || !role_code) return errorResponse('ROLE_NAME_CODE_REQUIRED', 400, 400);

  const existing: any = await query('SELECT id FROM sys_role WHERE role_code = ? AND deleted = 0', [
    role_code,
  ]);
  if (existing.length > 0) return errorResponse('ROLE_CODE_EXISTS', 400, 400);

  // 验证父角色是否存在且不形成循环
  if (parent_id) {
    const parent: any = await query(
      'SELECT id, parent_id FROM sys_role WHERE id = ? AND deleted = 0',
      [parent_id]
    );
    if (parent.length === 0) return errorResponse('PARENT_ROLE_NOT_FOUND', 400, 400);
  }

  const result: any = await execute(
    'INSERT INTO sys_role (role_name, role_code, parent_id, inherit_mode, description, data_scope, status, permissions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      role_name,
      role_code,
      parent_id || null,
      inherit_mode || 'merge',
      description || null,
      data_scope || 1,
      status ?? 1,
      JSON.stringify(permissions || []),
    ]
  );

  return successResponse({ id: result.insertId }, 'ROLE_CREATED');
});

export const PUT = withPermission(async (request: NextRequest, _userInfo: UserInfo) => {
  const body = await request.json();
  const {
    id,
    role_name,
    role_code,
    parent_id,
    inherit_mode,
    description,
    data_scope,
    status,
    permissions,
  } = body;

  if (!id) return errorResponse('ROLE_ID_REQUIRED', 400, 400);

  // 验证不形成循环继承
  if (parent_id !== undefined && parent_id !== null) {
    if (parent_id === id) return errorResponse('CANNOT_SET_SELF_AS_PARENT', 400, 400);
    // 检查父角色的祖先链中是否包含当前角色
    let checkId = parent_id;
    const visited = new Set<number>();
    while (checkId) {
      if (checkId === id) return errorResponse('CANNOT_FORM_CIRCULAR_INHERITANCE', 400, 400);
      if (visited.has(checkId)) break;
      visited.add(checkId);
      const parent: any = await query(
        'SELECT parent_id FROM sys_role WHERE id = ? AND deleted = 0',
        [checkId]
      );
      checkId = parent.length > 0 ? parent[0].parent_id : null;
    }
  }

  const fields: string[] = [];
  const values: any[] = [];
  if (role_name !== undefined) {
    fields.push('role_name = ?');
    values.push(role_name);
  }
  if (role_code !== undefined) {
    fields.push('role_code = ?');
    values.push(role_code);
  }
  if (parent_id !== undefined) {
    fields.push('parent_id = ?');
    values.push(parent_id);
  }
  if (inherit_mode !== undefined) {
    fields.push('inherit_mode = ?');
    values.push(inherit_mode);
  }
  if (description !== undefined) {
    fields.push('description = ?');
    values.push(description);
  }
  if (data_scope !== undefined) {
    fields.push('data_scope = ?');
    values.push(data_scope);
  }
  if (status !== undefined) {
    fields.push('status = ?');
    values.push(status);
  }
  if (permissions !== undefined) {
    fields.push('permissions = ?');
    values.push(JSON.stringify(permissions));
  }

  if (fields.length === 0) return errorResponse('NO_FIELDS_TO_UPDATE', 400, 400);

  values.push(id);
  await execute(`UPDATE sys_role SET ${fields.join(', ')} WHERE id = ? AND deleted = 0`, values);

  return successResponse(null, 'ROLE_UPDATED');
});

export const DELETE = withPermission(async (request: NextRequest, _userInfo: UserInfo) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return errorResponse('ROLE_ID_REQUIRED', 400, 400);

  // 检查是否有子角色
  const children: any = await query('SELECT id FROM sys_role WHERE parent_id = ? AND deleted = 0', [
    Number(id),
  ]);
  if (children.length > 0) return errorResponse('ROLE_HAS_CHILDREN', 400, 400);

  await execute('UPDATE sys_role SET deleted = 1 WHERE id = ?', [Number(id)]);
  return successResponse(null, 'ROLE_DELETED');
});
