/**
 * @module menu-service
 * @description 菜单服务端服务，提供菜单树和权限列表的查询能力。
 *
 * 抽自 /api/auth/menus 路由的核心逻辑，供服务端（如 layout.tsx SSR 预取）
 * 直接调用，避免发起 HTTP 自调用。内存级缓存由 auth-cache 模块提供。
 */
import { query } from '@/lib/db';
import { getCachedPermissions, setCachedPermissions } from '@/lib/auth-cache';
import { verifyTokenLight } from '@/lib/auth';
import { buildMenuTree, extractPermissions } from '@/lib/menu-tree';
import type { MenuTreeNode, MenuRow } from '@/lib/menu-tree';

export type { MenuTreeNode };

interface RoleRow {
  id: number;
  role_code: string;
  role_name: string;
  data_scope: string;
}

let isVisibleColumnExists: boolean | null = null;

async function checkIsVisibleColumn(): Promise<boolean> {
  if (isVisibleColumnExists !== null) return isVisibleColumnExists;
  try {
    const colCheck = await query<{ COLUMN_NAME: string }>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'sys_menu' AND COLUMN_NAME = 'is_visible'`
    );
    isVisibleColumnExists = Array.isArray(colCheck) && colCheck.length > 0;
  } catch {
    isVisibleColumnExists = false;
  }
  return isVisibleColumnExists;
}

/**
 * 根据用户 ID 获取菜单树和权限列表。
 *
 * 复用 auth-cache 的 5 分钟内存缓存，避免重复 DB 查询。
 * 与 /api/auth/menus 路由共享同一份缓存，确保 SSR 预取与 API 命中后
 * 返回完全一致的数据形态。
 */
export async function getMenusByUserId(userId: number): Promise<{
  menus: MenuTreeNode[];
  permissions: string[];
}> {
  const cached = getCachedPermissions(userId);
  if (cached) {
    return {
      menus: cached.menus as MenuTreeNode[],
      permissions: cached.permissions,
    };
  }

  const userRoles = await query<RoleRow>(
    `SELECT r.id, r.role_code, r.role_name, r.data_scope
     FROM sys_user_role ur
     JOIN sys_role r ON ur.role_id = r.id
     WHERE ur.user_id = ? AND r.status = 1`,
    [userId]
  );

  if (userRoles.length === 0) {
    return { menus: [], permissions: [] };
  }

  const roleIds = userRoles.map((r) => r.id);
  const hasIsVisible = await checkIsVisibleColumn();
  const visibleCondition = hasIsVisible ? 'AND m.is_visible = 1' : '';
  const placeholders = roleIds.map(() => '?').join(',');

  const menus = await query<MenuRow>(
    `SELECT DISTINCT m.id, m.menu_name, m.menu_code, m.menu_type, m.icon, m.path,
            m.component, m.permission, m.sort_order, m.parent_id, m.status
     FROM sys_menu m
     JOIN sys_role_menu rm ON m.id = rm.menu_id
     WHERE rm.role_id IN (${placeholders})
     AND m.status = 1
     ${visibleCondition}
     ORDER BY m.sort_order ASC, m.id ASC`,
    roleIds
  );

  const menuTree = buildMenuTree(menus);
  const permissions = extractPermissions(menus);

  setCachedPermissions(userId, permissions, menuTree);

  return { menus: menuTree, permissions };
}

/**
 * 根据访问令牌获取菜单（先轻量级校验 JWT 拿到 userId，再查询菜单）。
 *
 * 用于 SSR 预取场景：token 无效或过期时返回 null，调用方应降级到客户端 fetch。
 */
export async function getMenusByToken(token: string): Promise<{
  menus: MenuTreeNode[];
  permissions: string[];
} | null> {
  const payload = await verifyTokenLight(token);
  if (!payload) return null;
  return await getMenusByUserId(payload.userId);
}
