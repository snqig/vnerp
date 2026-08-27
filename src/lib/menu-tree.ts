/**
 * 菜单树构建工具（纯函数，可独立测试）
 *
 * 抽自 auth/menus/route.ts 与 menu-service.ts 的公共逻辑。
 * 核心职责：将 DB 返回的扁平菜单行数组递归构建为树形结构。
 *
 * 关键修复：顶级菜单的 parent_id 在数据库中为 NULL（非 0），
 * buildMenuTree 使用 `(parent_id ?? 0)` 将 NULL 归一化为 0，
 * 确保顶级菜单能正确匹配根节点。
 */

export interface MenuTreeNode {
  id: number;
  name: string;
  code: string;
  type: number;
  icon?: string;
  path?: string;
  component?: string;
  permission?: string;
  sortOrder: number;
  children: MenuTreeNode[];
}

export interface MenuRow {
  id: number;
  menu_name: string;
  menu_code: string;
  menu_type: number;
  icon: string | null;
  path: string | null;
  component: string | null;
  permission: string | null;
  sort_order: number;
  parent_id: number | null;
  status: number;
}

function toOptional(value: string | null): string | undefined {
  return value ?? undefined;
}

export function buildMenuTree(menus: MenuRow[], parentId: number = 0): MenuTreeNode[] {
  const tree: MenuTreeNode[] = [];
  for (const menu of menus) {
    if ((menu.parent_id ?? 0) === parentId) {
      const children = buildMenuTree(menus, menu.id);
      tree.push({
        id: menu.id,
        name: menu.menu_name,
        code: menu.menu_code,
        type: menu.menu_type,
        icon: toOptional(menu.icon),
        path: toOptional(menu.path),
        component: toOptional(menu.component),
        permission: toOptional(menu.permission),
        sortOrder: menu.sort_order,
        children: children.length > 0 ? children : [],
      });
    }
  }
  return tree;
}

export function extractPermissions(menus: MenuRow[]): string[] {
  return [...new Set(menus.filter((m) => m.permission).map((m) => m.permission as string))];
}
