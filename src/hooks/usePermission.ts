'use client';

import { useState, useEffect, useCallback } from 'react';

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

// 全局权限配置
const permissionModules = [
  {
    id: 'dashboard',
    name: tc('text_c7ysa'),
    permissions: [{ id: 'dashboard:view', name: tc('text_4lte3w') }],
  },
  {
    id: 'order',
    name: tc('text_hytrqw'),
    permissions: [
      { id: 'order:view', name: tc('text_dlur7d') },
      { id: 'order:create', name: tc('text_are5wy') },
      { id: 'order:edit', name: tc('text_gmqzji') },
      { id: 'order:delete', name: tc('text_azljxz') },
      { id: 'order:approve', name: tc('text_bzzmcq') },
    ],
  },
  {
    id: 'production',
    name: tc('text_f3xa0d'),
    permissions: [
      { id: 'production:view', name: tc('text_dlqwfi') },
      { id: 'production:create', name: tc('text_lno81e') },
      { id: 'production:edit', name: tc('text_ia56fm') },
      { id: 'production:delete', name: tc('text_elb55j') },
      { id: 'production:approve', name: tc('text_gqsxjq') },
    ],
  },
  {
    id: 'warehouse',
    name: tc('text_acd50l'),
    permissions: [
      { id: 'warehouse:view', name: tc('text_dlkh2e') },
      { id: 'warehouse:in', name: tc('text_anx7ct') },
      { id: 'warehouse:out', name: tc('text_aqkceg') },
      { id: 'warehouse:transfer', name: tc('text_i2pqus') },
    ],
  },
  {
    id: 'quality',
    name: tc('text_iew8do'),
    permissions: [
      { id: 'quality:view', name: tc('text_dlvcvh') },
      { id: 'quality:inspect', name: tc('text_dur6d7') },
      { id: 'quality:approve', name: tc('text_bzu2tf') },
    ],
  },
  {
    id: 'standard-card',
    name: tc('text_8rr715'),
    permissions: [
      { id: 'standard-card:view', name: tc('text_4iegh0') },
      { id: 'standard-card:create', name: tc('text_lpkqgt') },
      { id: 'standard-card:edit', name: tc('text_i88o07') },
      { id: 'standard-card:delete', name: tc('text_en7nky') },
      { id: 'standard-card:approve', name: tc('text_gowf4b') },
    ],
  },
  {
    id: 'system',
    name: tc('text_gao8uh'),
    permissions: [
      { id: 'system:user', name: tc('text_f6y6dw') },
      { id: 'system:role', name: tc('text_hxhx7p') },
      { id: 'system:menu', name: tc('text_gzj3um') },
      { id: 'system:config', name: tc('text_garzt1') },
    ],
  },
];

// 安全获取 localStorage
function safeGetUser(): any | null {
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
        // 获取角色的按钮权限
        const roleResponse = await fetch(`/api/organization/role`);
        const roleResult = await roleResponse.json();

        let buttonPermissions: string[] = [];
        if (roleResult.success) {
          const role = roleResult.data.find((r: any) => r.id === user.role_id);
          if (role && role.permissions) {
            buttonPermissions = role.permissions;
          }
        }

        setUserPermissions({
          menus: result.data.map((p: any) => p.menu_id),
          buttons: buttonPermissions,
          loaded: true,
        });
      }
    } catch {}
  }, []);

  // 检查是否有权限
  const hasPermission = useCallback(
    (permissionId: string): boolean => {
      const user = safeGetUser();
      if (user?.roles?.some((r: any) => r.role_code === 'super_admin')) return true;

      return userPermissions.buttons.includes(permissionId);
    },
    [userPermissions.buttons]
  );

  // 检查是否有菜单权限
  const hasMenuPermission = useCallback(
    (menuId: number): boolean => {
      const user = safeGetUser();
      if (user?.roles?.some((r: any) => r.role_code === 'super_admin')) return true;

      return userPermissions.menus.includes(menuId);
    },
    [userPermissions.menus]
  );

  // 检查是否有任意一个权限
  const hasAnyPermission = useCallback(
    (permissionIds: string[]): boolean => {
      const user = safeGetUser();
      if (user?.roles?.some((r: any) => r.role_code === 'super_admin')) return true;

      return permissionIds.some((id) => userPermissions.buttons.includes(id));
    },
    [userPermissions.buttons]
  );

  // 检查是否拥有所有权限
  const hasAllPermissions = useCallback(
    (permissionIds: string[]): boolean => {
      const user = safeGetUser();
      if (user?.roles?.some((r: any) => r.role_code === 'super_admin')) return true;

      return permissionIds.every((id) => userPermissions.buttons.includes(id));
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
