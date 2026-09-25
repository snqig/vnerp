/**
 * 角色管理接口（用户/角色侧）。
 *
 * ⚠️ `sys_role.permissions` 语义说明（2026-09-24 核准）：
 * 该列是**按钮权限码**（JSON 数组，通配形态如 `warehouse:*`），由
 * `/api/role-permissions/buttons` 正式读写，是前端按钮显隐的唯一数据源；
 * **不参与服务端鉴权** —— 鉴权链路 `getUserInfo`（src/lib/auth.ts）只读
 * `sys_role_menu` + `sys_menu`。
 * 本接口自 2026-09-24 起**不再写该列**（POST/PUT 均已摘除），与
 * `/api/organization/role` 同步收敛，避免「编辑角色」动作静默覆盖按钮权限。
 */
import { NextRequest } from 'next/server';
import { query, execute, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';
import type { DbRow } from '@/types/db';

export const GET = withPermission(async (request: NextRequest, _userInfo: UserInfo) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const withPermissions = searchParams.get('withPermissions') === 'true';

  const countResult = await query('SELECT COUNT(*) as total FROM sys_role WHERE deleted = 0');
  const total = countResult[0]?.total || 0;

  const rows = await query(
    `SELECT id, role_name, role_code, parent_id, inherit_mode, description, data_scope, status, permissions, create_time
     FROM sys_role WHERE deleted = 0 ORDER BY id LIMIT ? OFFSET ?`,
    [pageSize, (page - 1) * pageSize]
  );

  // `permissions` 是**按钮权限**列（JSON 数组），此处原样透出以兼容既有调用方。
  // 它是**只读遗留输出**：本接口自 2026-09-24 起不再写该列，正式写入口是
  // `/api/role-permissions/buttons`。注意 mysql2 对 JSON 列会自动解析为 JS 数组，
  // 故需同时兼容「已是数组」与「仍是 JSON 字符串」两种形态。
  const list: DbRow[] = rows.map((row: DbRow) => ({
    ...row,
    permissions:
      typeof row.permissions === 'string'
        ? JSON.parse(row.permissions || '[]')
        : row.permissions || [],
  }));

  // 如果需要继承权限，解析完整权限链
  if (withPermissions) {
    for (const role of list) {
      (role as any).effectivePermissions = await resolveEffectivePermissions(Number(role.id));
      (role as any).parentRole = role.parent_id ? await getParentRoleName(Number(role.parent_id)) : null;
    }
  }

  return successResponse({ list, total, page, pageSize });
});

// 解析角色的有效权限（包含继承的权限）。
// ⚠️ 死路径：仅在 `?withPermissions=true` 时被调用，而全仓无任何前端使用该参数
// （`src/app/[locale]/settings/user/page.tsx` 是本接口 GET 的唯一调用方，只取 id/role_name）。
// 它读 `sys_role.permissions`（按钮权限轨）做父子合并，但结果仅作为响应附加字段返回，
// **不参与任何鉴权**。保留以备将来启用角色继承，勿据此认为该列是鉴权数据源。
async function resolveEffectivePermissions(
  roleId: number,
  visited = new Set<number>()
): Promise<string[]> {
  if (visited.has(roleId)) return []; // 防止循环继承
  visited.add(roleId);

  const role = await query(
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
  const rows = await query('SELECT role_name FROM sys_role WHERE id = ? AND deleted = 0', [
    parentId,
  ]);
  return rows.length > 0 ? rows[0].role_name : null;
}

export const POST = withPermission(async (request: NextRequest, _userInfo: UserInfo) => {
  const body = await request.json();
  // 不接收 `permissions`（按钮权限轨）。该列的正式写入口是
  // `/api/role-permissions/buttons`；在此写入会在「编辑/新建角色」时静默覆盖按钮权限。
  const {
    role_name,
    role_code,
    parent_id,
    inherit_mode,
    description,
    data_scope,
    status,
  } = body;

  if (!role_name || !role_code) return errorResponse('ROLE_NAME_CODE_REQUIRED', 400, 400);

  const existing = await query('SELECT id FROM sys_role WHERE role_code = ? AND deleted = 0', [
    role_code,
  ]);
  if (existing.length > 0) return errorResponse('ROLE_CODE_EXISTS', 400, 400);

  // 验证父角色是否存在且不形成循环
  if (parent_id) {
    const parent = await query('SELECT id, parent_id FROM sys_role WHERE id = ? AND deleted = 0', [
      parent_id,
    ]);
    if (parent.length === 0) return errorResponse('PARENT_ROLE_NOT_FOUND', 400, 400);
  }

  const result = await execute(
    'INSERT INTO sys_role (role_name, role_code, parent_id, inherit_mode, description, data_scope, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      role_name,
      role_code,
      parent_id || null,
      inherit_mode || 'merge',
      description || null,
      data_scope || 1,
      status ?? 1,
    ]
  );

  return successResponse({ id: result.insertId }, 'ROLE_CREATED');
});

export const PUT = withPermission(async (request: NextRequest, _userInfo: UserInfo) => {
  const body = await request.json();
  // 与 POST 同理：不接收 `permissions`，避免编辑角色时覆盖按钮权限。
  const {
    id,
    role_name,
    role_code,
    parent_id,
    inherit_mode,
    description,
    data_scope,
    status,
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
      const parent = await query('SELECT parent_id FROM sys_role WHERE id = ? AND deleted = 0', [
        checkId,
      ]);
      checkId = parent.length > 0 ? parent[0].parent_id : null;
    }
  }

  const fields: string[] = [];
  const values: SqlValue[] = [];
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
  // `permissions` 分支已于 2026-09-24 移除（见 POST 注释）。

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
  const children = await query('SELECT id FROM sys_role WHERE parent_id = ? AND deleted = 0', [
    Number(id),
  ]);
  if (children.length > 0) return errorResponse('ROLE_HAS_CHILDREN', 400, 400);

  await execute('UPDATE sys_role SET deleted = 1 WHERE id = ?', [Number(id)]);
  return successResponse(null, 'ROLE_DELETED');
});
