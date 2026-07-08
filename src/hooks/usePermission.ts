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
    name: '仪表盘',
    permissions: [{ id: 'dashboard:view', name: '查看仪表盘' }],
  },
  {
    id: 'order',
    name: '订单管理',
    permissions: [
      { id: 'order:view', name: '查看订单' },
      { id: 'order:create', name: '创建订单' },
      { id: 'order:edit', name: '编辑订单' },
      { id: 'order:delete', name: '删除订单' },
      { id: 'order:approve', name: '审核订单' },
    ],
  },
  {
    id: 'production',
    name: '生产管理',
    permissions: [
      { id: 'production:view', name: '查看生产' },
      { id: 'production:create', name: '创建生产单' },
      { id: 'production:edit', name: '编辑生产单' },
      { id: 'production:delete', name: '删除生产单' },
      { id: 'production:approve', name: '审核生产单' },
    ],
  },
  {
    id: 'warehouse',
    name: '仓库管理',
    permissions: [
      { id: 'warehouse:view', name: '查看仓库' },
      { id: 'warehouse:in', name: '入库操作' },
      { id: 'warehouse:out', name: '出库操作' },
      { id: 'warehouse:transfer', name: '调拨操作' },
    ],
  },
  {
    id: 'quality',
    name: '质量管理',
    permissions: [
      { id: 'quality:view', name: '查看质量' },
      { id: 'quality:inspect', name: '检验操作' },
      { id: 'quality:approve', name: '审核检验' },
    ],
  },
  {
    id: 'standard-card',
    name: '标准卡管理',
    permissions: [
      { id: 'standard-card:view', name: '查看标准卡' },
      { id: 'standard-card:create', name: '创建标准卡' },
      { id: 'standard-card:edit', name: '编辑标准卡' },
      { id: 'standard-card:delete', name: '删除标准卡' },
      { id: 'standard-card:approve', name: '审核标准卡' },
    ],
  },
  {
    id: 'system',
    name: '系统管理',
    permissions: [
      { id: 'system:user', name: '用户管理' },
      { id: 'system:role', name: '角色管理' },
      { id: 'system:menu', name: '菜单管理' },
      { id: 'system:config', name: '系统配置' },
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
    } catch (error) {
    }
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
