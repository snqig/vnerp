'use client';

import { useState, useEffect, useCallback } from 'react';
import { PERMISSION_MODULES } from '@/lib/permissions-catalog';
import { hasPermissionIn } from '@/lib/permission-match';

/** 超管硬绕过判定：与服务端 `hasPermission`（src/lib/auth.ts）保持一致 */
function isSuperAdmin(user: StoredUser | null): boolean {
  return Boolean(user?.roles?.some((r: { role_code: string }) => r.role_code === 'super_admin'));
}

// 权限类型
export interface Permission {
  id: string;
  name: string;
  description?: string;
  module?: string;
}

// 用户权限状态
interface UserPermissions {
  menus: number[];
  buttons: string[];
  loaded: boolean;
}

// 用户信息结构（从 localStorage 解析）
interface StoredUser {
  role_id?: number;
  roles?: Array<{ role_code: string }>;
  [key: string]: unknown;
}

// 全局权限配置
//
// 单一数据源：直接引用 `@/lib/permissions-catalog` 中的 `PERMISSION_MODULES`。
// 该常量的每个权限 id 都来自 API 网关实际校验的 `API_PERMISSIONS`，
// 因此角色权限勾选界面可授予的权限与后端强制校验的权限始终一致，
// 不会再出现历史上 `warehouse:in` / `production:view` 等无法生效的“幽灵权限码”。
const permissionModules = PERMISSION_MODULES;

// 安全获取 localStorage
function safeGetUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

// 获取权限模块列表
export const getPermissionModules = () => permissionModules;

// 权限Hook
export function usePermission() {
  const [userPermissions, setUserPermissions] = useState<UserPermissions>({
    menus: [],
    buttons: [],
    loaded: false,
  });

  // 加载用户权限
  const loadPermissions = useCallback(async () => {
    try {
      const user = safeGetUser();
      if (!user || !user.role_id) return;

      // 获取角色权限
      const response = await fetch(`/api/role-permissions?roleId=${user.role_id}`);
      const result = await response.json();

      if (result.success) {
        // 获取角色的按钮权限。
        // 数据源固定为按钮权限专用接口：`data` 直接就是权限码数组。
        // 此前这里读的是 `/api/organization/role`，而该接口返回的是分页结构
        // （`{list,total,page,pageSize}`），对其 data 直接 find 会抛 TypeError 并被
        // 外层 catch {} 静默吞掉 —— 结果是按钮权限恒为空、loaded 永远 false。
        const btnResponse = await fetch(`/api/role-permissions/buttons?roleId=${user.role_id}`);
        const btnResult = await btnResponse.json();

        setUserPermissions({
          menus: Array.isArray(result.data) ? result.data.map((p: { menu_id: number }) => p.menu_id) : [],
          buttons: Array.isArray(btnResult?.data) ? btnResult.data : [],
          loaded: true,
        });
      }
    } catch {}
  }, []);

  // 检查是否有权限。
  // 持有码是旧轨 `sys_role.permissions` 的值，形如 `warehouse:*` / `orders:sales:*`，
  // 而调用方传的是 API 侧精确码（如 `warehouse:view`）—— 纯字面量 includes 永不命中。
  // 必须走 `hasPermissionIn` 的通配符展开 + 模块别名归一，与服务端 `src/lib/auth.ts` 口径一致。
  const hasPermission = useCallback(
    (permissionId: string): boolean => {
      if (isSuperAdmin(safeGetUser())) return true;

      return hasPermissionIn(userPermissions.buttons, permissionId);
    },
    [userPermissions.buttons]
  );

  // 检查是否有菜单权限
  const hasMenuPermission = useCallback(
    (menuId: number): boolean => {
      if (isSuperAdmin(safeGetUser())) return true;

      return userPermissions.menus.includes(menuId);
    },
    [userPermissions.menus]
  );

  // 检查是否有任意一个权限
  const hasAnyPermission = useCallback(
    (permissionIds: string[]): boolean => {
      if (isSuperAdmin(safeGetUser())) return true;

      return permissionIds.some((id) => hasPermissionIn(userPermissions.buttons, id));
    },
    [userPermissions.buttons]
  );

  // 检查是否拥有所有权限
  const hasAllPermissions = useCallback(
    (permissionIds: string[]): boolean => {
      if (isSuperAdmin(safeGetUser())) return true;

      return permissionIds.every((id) => hasPermissionIn(userPermissions.buttons, id));
    },
    [userPermissions.buttons]
  );

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  return {
    hasPermission,
    hasMenuPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions: userPermissions.buttons,
    menus: userPermissions.menus,
    loaded: userPermissions.loaded,
    refresh: loadPermissions,
  };
}

export default usePermission;
