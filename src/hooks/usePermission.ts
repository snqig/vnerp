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
    permissions: [
      { id: 'dashboard:view', name: '查看仪表盘' },
    ],
  },
  {
    id: 'order',
    name: '订单管理',
    permissions: [
      { id: 'order:view', name: '查看订单' },
      { id: 'order:create', name: '创建订单' },
      { id: 'order:edit', name: '编辑订单' },
      { id: 'order:delete', name: '删除订单' },
      { id: 'order:export', name: '导出订单' },
    ],
  },
  {
    id: 'sample',
    name: '打样中心',
    permissions: [
      { id: 'sample:view', name: '查看打样' },
      { id: 'sample:create', name: '创建打样' },
      { id: 'sample:edit', name: '编辑打样' },
      { id: 'sample:delete', name: '删除打样' },
      { id: 'sample:approve', name: '审批打样' },
    ],
  },
  {
    id: 'purchase',
    name: '采购管理',
    permissions: [
      { id: 'purchase:view', name: '查看采购' },
      { id: 'purchase:create', name: '创建采购' },
      { id: 'purchase:edit', name: '编辑采购' },
      { id: 'purchase:delete', name: '删除采购' },
      { id: 'purchase:approve', name: '审批采购' },
    ],
  },
  {
    id: 'warehouse',
    name: '仓库管理',
    permissions: [
      { id: 'warehouse:view', name: '查看仓库' },
      { id: 'warehouse:inbound', name: '入库操作' },
      { id: 'warehouse:outbound', name: '出库操作' },
      { id: 'warehouse:transfer', name: '库存调拨' },
    ],
  },
  {
    id: 'production',
    name: '生产管理',
    permissions: [
      { id: 'production:view', name: '查看生产' },
      { id: 'production:create', name: '创建工单' },
      { id: 'production:edit', name: '编辑工单' },
      { id: 'production:schedule', name: '生产排程' },
    ],
  },
  {
    id: 'quality',
    name: '品质管理',
    permissions: [
      { id: 'quality:view', name: '查看品质' },
      { id: 'quality:inspect', name: '品质检验' },
      { id: 'quality:report', name: '品质报告' },
    ],
  },
  {
    id: 'hr',
    name: '人事管理',
    permissions: [
      { id: 'hr:view', name: '查看员工' },
      { id: 'hr:create', name: '新增员工' },
      { id: 'hr:edit', name: '编辑员工' },
      { id: 'hr:delete', name: '删除员工' },
      { id: 'hr:print', name: '打印上岗证' },
      { id: 'hr:export', name: '导出员工' },
    ],
  },
  {
    id: 'finance',
    name: '财务管理',
    permissions: [
      { id: 'finance:view', name: '查看财务' },
      { id: 'finance:receivable', name: '应收管理' },
      { id: 'finance:payable', name: '应付管理' },
      { id: 'finance:report', name: '财务报表' },
    ],
  },
  {
    id: 'settings',
    name: '系统设置',
    permissions: [
      { id: 'settings:view', name: '查看设置' },
      { id: 'settings:company', name: '企业设置' },
      { id: 'settings:department', name: '部门管理' },
      { id: 'settings:role', name: '角色管理' },
      { id: 'settings:permission', name: '权限管理' },
      { id: 'settings:user', name: '用户管理' },
      { id: 'settings:menu', name: '菜单管理' },
    ],
  },
];

// 获取所有权限列表
export const getAllPermissions = (): Permission[] => {
  const permissions: Permission[] = [];
  permissionModules.forEach(module => {
    module.permissions.forEach(perm => {
      permissions.push({
        ...perm,
        module: module.name,
      });
    });
  });
  return permissions;
};

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
      // 从localStorage获取用户信息
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      
      const user = JSON.parse(userStr);
      if (!user.role_id) return;

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
      console.error('加载权限失败:', error);
    }
  }, []);

  // 检查是否有权限
  const hasPermission = useCallback((permissionId: string): boolean => {
    // 超级管理员拥有所有权限
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.roles?.some((r: any) => r.role_code === 'super_admin')) return true;
    }
    
    return userPermissions.buttons.includes(permissionId);
  }, [userPermissions.buttons]);

  // 检查是否有菜单权限
  const hasMenuPermission = useCallback((menuId: number): boolean => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.roles?.some((r: any) => r.role_code === 'super_admin')) return true;
    }
    
    return userPermissions.menus.includes(menuId);
  }, [userPermissions.menus]);

  // 检查是否有任意一个权限
  const hasAnyPermission = useCallback((permissionIds: string[]): boolean => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.roles?.some((r: any) => r.role_code === 'super_admin')) return true;
    }
    
    return permissionIds.some(id => userPermissions.buttons.includes(id));
  }, [userPermissions.buttons]);

  // 检查是否拥有所有权限
  const hasAllPermissions = useCallback((permissionIds: string[]): boolean => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.roles?.some((r: any) => r.role_code === 'super_admin')) return true;
    }
    
    return permissionIds.every(id => userPermissions.buttons.includes(id));
  }, [userPermissions.buttons]);

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
