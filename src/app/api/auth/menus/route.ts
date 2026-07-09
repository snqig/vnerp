import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import {
  getCachedPermissions,
  setCachedPermissions,
  clearCachedPermissions,
} from '@/lib/auth-cache';
import { buildMenuTree, extractPermissions } from '@/lib/menu-tree';

let isVisibleColumnExists: boolean | null = null;

async function checkIsVisibleColumn(): Promise<boolean> {
  if (isVisibleColumnExists !== null) return isVisibleColumnExists;
  try {
    const colCheck: Loose = await query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'sys_menu' AND COLUMN_NAME = 'is_visible'`
    );
    isVisibleColumnExists = colCheck.length > 0;
  } catch {
    isVisibleColumnExists = false;
  }
  return isVisibleColumnExists;
}

export const GET = withPermission(async (request: NextRequest, userInfo) => {
  const cached = getCachedPermissions(userInfo.userId);
  if (cached) {
    return successResponse(
      {
        menus: cached.menus,
        permissions: cached.permissions,
      },
      '获取成功（缓存）'
    );
  }

  const userRoles = await query(
    `SELECT r.id, r.role_code, r.role_name, r.data_scope
     FROM sys_user_role ur
     JOIN sys_role r ON ur.role_id = r.id
     WHERE ur.user_id = ? AND r.status = 1`,
    [userInfo.userId]
  );

  if (userRoles.length === 0) {
    return successResponse({
      menus: [],
      permissions: [],
      roles: [],
    });
  }

  const roleIds = (userRoles as Loose[]).map((r) => r.id);

  const hasIsVisible = await checkIsVisibleColumn();
  const visibleCondition = hasIsVisible ? 'AND m.is_visible = 1' : '';

  const placeholders = roleIds.map(() => '?').join(',');
  const menus = await query(
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

  const menuTree = buildMenuTree(menus as Loose[]);

  const permissions = extractPermissions(menus as Loose[]);

  setCachedPermissions(userInfo.userId, permissions, menuTree);

  return successResponse({
    menus: menuTree,
    permissions,
    roles: userRoles,
  });
});

export const DELETE = withPermission(async (request: NextRequest, userInfo) => {
  clearCachedPermissions(userInfo.userId);
  return successResponse(null, '缓存已清除');
});
