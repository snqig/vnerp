import { describe, it, expect } from 'vitest';

/**
 * 角色权限继承 单元测试
 * 
 * 支持两种继承模式：
 * - merge: 合并父角色权限和自身权限
 * - override: 仅使用自身权限（如果自身有权限），否则继承父权限
 */

interface Role {
  id: number;
  parent_id: number | null;
  inherit_mode: 'merge' | 'override';
  permissions: string[];
}

/**
 * 解析角色的有效权限（递归，含循环继承检测）
 */
function resolveEffectivePermissions(
  role: Role,
  allRoles: Map<number, Role>,
  visited = new Set<number>()
): string[] {
  if (visited.has(role.id)) return []; // 防止循环继承
  visited.add(role.id);

  if (!role.parent_id) {
    return [...role.permissions];
  }

  const parentRole = allRoles.get(role.parent_id);
  if (!parentRole) {
    return [...role.permissions];
  }

  const parentPermissions = resolveEffectivePermissions(parentRole, allRoles, visited);

  if (role.inherit_mode === 'override') {
    // 覆盖模式：自身有权限则用自身，否则用父权限
    return role.permissions.length > 0 ? [...role.permissions] : parentPermissions;
  }

  // 合并模式：合并父权限和自身权限
  return [...new Set([...parentPermissions, ...role.permissions])];
}

describe('角色权限继承', () => {
  describe('resolveEffectivePermissions', () => {
    it('无父角色：返回自身权限', () => {
      const role: Role = {
        id: 1,
        parent_id: null,
        inherit_mode: 'merge',
        permissions: ['user:view', 'user:create'],
      };
      const allRoles = new Map([[1, role]]);
      const result = resolveEffectivePermissions(role, allRoles);
      expect(result).toEqual(['user:view', 'user:create']);
    });

    it('合并模式：合并父角色和自身权限', () => {
      const parentRole: Role = {
        id: 1,
        parent_id: null,
        inherit_mode: 'merge',
        permissions: ['user:view', 'user:create'],
      };
      const childRole: Role = {
        id: 2,
        parent_id: 1,
        inherit_mode: 'merge',
        permissions: ['order:view', 'order:create'],
      };
      const allRoles = new Map([[1, parentRole], [2, childRole]]);
      const result = resolveEffectivePermissions(childRole, allRoles);
      expect(result.sort()).toEqual(['user:view', 'user:create', 'order:view', 'order:create'].sort());
    });

    it('合并模式：去重', () => {
      const parentRole: Role = {
        id: 1,
        parent_id: null,
        inherit_mode: 'merge',
        permissions: ['user:view', 'user:create'],
      };
      const childRole: Role = {
        id: 2,
        parent_id: 1,
        inherit_mode: 'merge',
        permissions: ['user:view', 'order:view'], // user:view重复
      };
      const allRoles = new Map([[1, parentRole], [2, childRole]]);
      const result = resolveEffectivePermissions(childRole, allRoles);
      expect(result.sort()).toEqual(['user:view', 'user:create', 'order:view'].sort());
    });

    it('覆盖模式：自身有权限则不继承父权限', () => {
      const parentRole: Role = {
        id: 1,
        parent_id: null,
        inherit_mode: 'merge',
        permissions: ['user:view', 'user:create', 'user:delete'],
      };
      const childRole: Role = {
        id: 2,
        parent_id: 1,
        inherit_mode: 'override',
        permissions: ['order:view', 'order:create'],
      };
      const allRoles = new Map([[1, parentRole], [2, childRole]]);
      const result = resolveEffectivePermissions(childRole, allRoles);
      expect(result).toEqual(['order:view', 'order:create']);
    });

    it('覆盖模式：自身无权限则继承父权限', () => {
      const parentRole: Role = {
        id: 1,
        parent_id: null,
        inherit_mode: 'merge',
        permissions: ['user:view', 'user:create'],
      };
      const childRole: Role = {
        id: 2,
        parent_id: 1,
        inherit_mode: 'override',
        permissions: [], // 自身无权限
      };
      const allRoles = new Map([[1, parentRole], [2, childRole]]);
      const result = resolveEffectivePermissions(childRole, allRoles);
      expect(result).toEqual(['user:view', 'user:create']);
    });

    it('三级继承：管理员→部门经理→普通员工', () => {
      const adminRole: Role = {
        id: 1,
        parent_id: null,
        inherit_mode: 'merge',
        permissions: ['system:manage', 'user:view', 'user:create', 'user:delete'],
      };
      const managerRole: Role = {
        id: 2,
        parent_id: 1,
        inherit_mode: 'merge',
        permissions: ['order:approve', 'report:view'],
      };
      const employeeRole: Role = {
        id: 3,
        parent_id: 2,
        inherit_mode: 'merge',
        permissions: ['order:view', 'order:create'],
      };
      const allRoles = new Map([[1, adminRole], [2, managerRole], [3, employeeRole]]);
      
      const employeePerms = resolveEffectivePermissions(employeeRole, allRoles);
      expect(employeePerms.sort()).toEqual([
        'system:manage', 'user:view', 'user:create', 'user:delete',
        'order:approve', 'report:view',
        'order:view', 'order:create',
      ].sort());
    });

    it('循环继承检测：A→B→A（检测到循环后只返回已访问的权限）', () => {
      const roleA: Role = {
        id: 1,
        parent_id: 2,
        inherit_mode: 'merge',
        permissions: ['perm:a'],
      };
      const roleB: Role = {
        id: 2,
        parent_id: 1,
        inherit_mode: 'merge',
        permissions: ['perm:b'],
      };
      const allRoles = new Map([[1, roleA], [2, roleB]]);
      // 不应无限循环，B先被访问获取自身权限，A发现B已访问则只返回A自身权限
      const result = resolveEffectivePermissions(roleA, allRoles);
      // A先访问B，B发现A是父角色但A已visited，返回B自身权限['perm:b']
      // A合并B的权限和自身权限
      expect(result.sort()).toEqual(['perm:a', 'perm:b'].sort());
    });

    it('父角色不存在：返回自身权限', () => {
      const role: Role = {
        id: 1,
        parent_id: 999,
        inherit_mode: 'merge',
        permissions: ['user:view'],
      };
      const allRoles = new Map([[1, role]]);
      const result = resolveEffectivePermissions(role, allRoles);
      expect(result).toEqual(['user:view']);
    });
  });
});
