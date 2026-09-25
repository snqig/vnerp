import { getTranslations } from 'next-intl/server';

;
﻿import { NextRequest } from 'next/server';
import { query, execute, queryOne, SqlValue } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  validateRequestBody,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';
import { numericFilter } from '@/lib/query-filter';

// 角色数据接口
interface Role {
  id?: number;
  role_code: string;
  role_name: string;
  description?: string;
  data_scope?: number;
  role_type?: number;
  sort_order?: number;
  status?: number;
  /**
   * 遗留字段：`sys_role.permissions`（角色级权限串）。
   * 服务端鉴权链路完全不读它（`getUserInfo` 只走 sys_role_menu + sys_menu），
   * 仅前端按钮权限 hook（usePermission）消费。2026-09-24 起写入通道已关闭
   * （POST / PUT 均不再写该列），后续将冻结并清理。
   */
  permissions?: string | string[];
  create_time?: string;
  update_time?: string;
}

// 构建查询条件
function buildQueryConditions(params: { keyword: string; status?: number }): {
  sql: string;
  values: SqlValue[];
} {
  let sql = `
    SELECT
      id, role_code, role_name, description, data_scope, status, permissions,
      role_type, sort_order,
      create_time, update_time
    FROM sys_role
    WHERE deleted = 0
  `;
  const values: SqlValue[] = [];

  if (params.keyword) {
    sql += ' AND (role_name LIKE ? OR role_code LIKE ?)';
    const likeKeyword = `%${params.keyword}%`;
    values.push(likeKeyword, likeKeyword);
  }

  if (params.status !== undefined) {
    sql += ' AND status = ?';
    values.push(params.status);
  }

  sql += ' ORDER BY id ASC';

  return { sql, values };
}

// 格式化角色数据。
// `permissions` 原样透出（兼容仍在读该字段的前端），但它是**只读遗留数据**：
// 不参与任何服务端判定，也不应被写回（见 Role.permissions 注释）。
function formatRole(role: DbRow) {
  let permissions: string[] = [];
  const raw = role.permissions;
  if (raw == null) {
    permissions = [];
  } else if (Array.isArray(raw)) {
    // mysql2 已自动解析 JSON 列，raw 直接是数组
    permissions = raw as string[];
  } else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      permissions = Array.isArray(parsed) ? parsed : [parsed as unknown as string];
    } catch {
      // 非 JSON，按逗号分隔处理
      permissions = raw.split(',').filter((p: string) => p.trim());
    }
  }
  return {
    ...role,
    code: role.role_code,
    name: role.role_name,
    permissions,
  };
}

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const status = numericFilter(searchParams.get('status'));
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  const { sql, values } = buildQueryConditions({
    keyword,
    status,
  });

  let countSql = `SELECT COUNT(*) as total FROM sys_role WHERE deleted = 0`;
  const countValues: SqlValue[] = [];

  if (keyword) {
    countSql += ' AND (role_name LIKE ? OR role_code LIKE ?)';
    countValues.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (status !== undefined) {
    countSql += ' AND status = ?';
    countValues.push(status);
  }

  const countResult = await query(countSql, countValues);
  const total = (countResult as DbRow[])[0]?.total || 0;

  const paginatedSql = `${sql} LIMIT ? OFFSET ?`;
  const paginatedValues = [...values, pageSize, (page - 1) * pageSize];

  const roles = await query<DbRow>(paginatedSql, paginatedValues);
  const formattedRoles = roles.map(formatRole);

  return successResponse({
    list: formattedRoles,
    total,
    page,
    pageSize,
  });
});

// POST - 创建角色
export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const tc = await getTranslations('Common');
  const ts = await getTranslations('Common');
    const body: Role = await request.json();

    // 验证必填字段
    const validation = validateRequestBody(body, ['role_code', 'role_name']);

    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    // 检查编码是否已存在
    const existing = await queryOne<{ id: number }>(
      'SELECT id FROM sys_role WHERE role_code = ? AND deleted = 0',
      [body.role_code]
    );

    if (existing) {
      return errorResponse(ts('k_14rslzi'), 409, 409);
    }

    // 不再写 `sys_role.permissions`（旧轨）。
    // 服务端鉴权链路 getUserInfo 只读 sys_role_menu + sys_menu，该列不被任何权限判定消费；
    // 只有前端按钮权限 hook（usePermission）读它。角色权限的统一入口是
    // `/api/role-permissions`（菜单轨）与 `/api/role-permissions/buttons`（按钮轨），
    // 此处若继续写，会把「编辑角色基本信息」变成一次对权限状态的静默回退。
    const result = await execute(
      `INSERT INTO sys_role (role_code, role_name, description, data_scope, status, role_type, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        body.role_code,
        body.role_name,
        body.description ?? null,
        body.data_scope ?? 1,
        body.status ?? 1,
        body.role_type ?? 2,
        body.sort_order ?? 0,
      ]
    );

    return successResponse({ id: result.insertId }, tc('roleCreateSuccess'));
  },
  { logTitle: '创建角色' }
);

// PUT - 更新角色
export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
  const tc = await getTranslations('Common');
  const ts = await getTranslations('Common');
    const body: Role = await request.json();
    const { id } = body;

    if (!id) {
      return commonErrors.badRequest(ts('k_2gmrs2'));
    }

    // 验证必填字段
    const validation = validateRequestBody(body, ['role_name']);

    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    // 检查角色是否存在
    const existingRole = await queryOne<{ id: number }>(
      'SELECT id FROM sys_role WHERE id = ? AND deleted = 0',
      [id]
    );

    if (!existingRole) {
      return commonErrors.notFound(ts('k_lrx46w'));
    }

    // 与 POST 同理：不写 `sys_role.permissions`。
    // 前端编辑角色时表单里会带一份打开对话框那一刻的权限快照，若后端照单写回，
    // 用户在权限对话框里新授的按钮权限会被这次「只改个角色名」的操作静默回退。
    const result = await execute(
      `UPDATE sys_role SET
      role_name = ?,
      description = ?,
      data_scope = ?,
      status = ?,
      role_type = ?,
      sort_order = ?
    WHERE id = ? AND deleted = 0`,
      [
        body.role_name,
        body.description ?? null,
        body.data_scope ?? 1,
        body.status ?? 1,
        body.role_type ?? 2,
        body.sort_order ?? 0,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return commonErrors.notFound(ts('k_lrx46w'));
    }

    return successResponse(null, tc('roleUpdateSuccess'));
  },
  { logTitle: '更新角色' }
);

// DELETE - 删除角色（软删除）
export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
  const tc = await getTranslations('Common');
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return commonErrors.badRequest(ts('k_2gmrs2'));
    }

    const roleId = parseInt(id);

    // 检查角色是否存在
    const existingRole = await queryOne<{ id: number }>(
      'SELECT id FROM sys_role WHERE id = ? AND deleted = 0',
      [roleId]
    );

    if (!existingRole) {
      return commonErrors.notFound(ts('k_lrx46w'));
    }

    // 检查是否有用户关联此角色
    const hasUsers = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM sys_user_role WHERE role_id = ?',
      [roleId]
    );

    if (hasUsers && hasUsers.count > 0) {
      return errorResponse(ts('k_o3j3ba'), 409, 409);
    }

    await execute('UPDATE sys_role SET deleted = 1 WHERE id = ?', [roleId]);

    return successResponse(null, tc('roleDeleted'));
  },
  { logTitle: '删除角色' }
);
