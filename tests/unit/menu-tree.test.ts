import { describe, it, expect } from 'vitest';
import { buildMenuTree, extractPermissions, type MenuRow } from '@/lib/menu-tree';

function makeRow(overrides: Partial<MenuRow>): MenuRow {
  return {
    id: 1,
    menu_name: 'test',
    menu_code: 'test',
    menu_type: 1,
    icon: null,
    path: null,
    component: null,
    permission: null,
    sort_order: 1,
    parent_id: null,
    status: 1,
    ...overrides,
  };
}

describe('buildMenuTree', () => {
  it('treats null parent_id as root (0) — the regression fix', () => {
    const rows: MenuRow[] = [
      makeRow({ id: 1, menu_name: '看板中心', parent_id: null }),
      makeRow({ id: 2, menu_name: '业务部', parent_id: null }),
      makeRow({ id: 11, menu_name: '总览看板', parent_id: 1, menu_type: 2 }),
    ];

    const tree = buildMenuTree(rows);

    expect(tree).toHaveLength(2);
    expect(tree[0].name).toBe('看板中心');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].name).toBe('总览看板');
  });

  it('treats 0 parent_id as root (backward compat)', () => {
    const rows: MenuRow[] = [
      makeRow({ id: 1, parent_id: 0 }),
      makeRow({ id: 2, parent_id: 1 }),
    ];

    const tree = buildMenuTree(rows);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe(1);
    expect(tree[0].children).toHaveLength(1);
  });

  it('handles mixed null and 0 parent_id as roots', () => {
    const rows: MenuRow[] = [
      makeRow({ id: 1, menu_name: 'A', parent_id: null }),
      makeRow({ id: 2, menu_name: 'B', parent_id: 0 }),
    ];

    const tree = buildMenuTree(rows);

    expect(tree).toHaveLength(2);
  });

  it('returns empty array when no root menus exist', () => {
    const rows: MenuRow[] = [
      makeRow({ id: 2, parent_id: 1 }),
      makeRow({ id: 3, parent_id: 1 }),
    ];

    const tree = buildMenuTree(rows);

    expect(tree).toHaveLength(0);
  });

  it('builds deeply nested tree (3+ levels)', () => {
    const rows: MenuRow[] = [
      makeRow({ id: 1, parent_id: null, menu_name: 'L1' }),
      makeRow({ id: 2, parent_id: 1, menu_name: 'L2' }),
      makeRow({ id: 3, parent_id: 2, menu_name: 'L3' }),
      makeRow({ id: 4, parent_id: 3, menu_name: 'L4' }),
    ];

    const tree = buildMenuTree(rows);

    expect(tree).toHaveLength(1);
    expect(tree[0].children[0].children[0].children[0].name).toBe('L4');
  });

  it('converts null icon/path/component/permission to undefined', () => {
    const rows: MenuRow[] = [
      makeRow({ id: 1, parent_id: null, icon: null, path: null, permission: null }),
    ];

    const tree = buildMenuTree(rows);

    expect(tree[0].icon).toBeUndefined();
    expect(tree[0].path).toBeUndefined();
    expect(tree[0].permission).toBeUndefined();
  });

  it('preserves non-null field values', () => {
    const rows: MenuRow[] = [
      makeRow({
        id: 1,
        parent_id: null,
        icon: 'dashboard',
        path: '/dashboard',
        permission: 'dashboard:view',
        sort_order: 5,
      }),
    ];

    const tree = buildMenuTree(rows);

    expect(tree[0].icon).toBe('dashboard');
    expect(tree[0].path).toBe('/dashboard');
    expect(tree[0].permission).toBe('dashboard:view');
    expect(tree[0].sortOrder).toBe(5);
  });

  it('returns empty children array for leaf nodes', () => {
    const rows: MenuRow[] = [
      makeRow({ id: 1, parent_id: null }),
    ];

    const tree = buildMenuTree(rows);

    expect(tree[0].children).toEqual([]);
  });

  it('handles empty input', () => {
    expect(buildMenuTree([])).toEqual([]);
  });

  it('does not mutate input array', () => {
    const rows: MenuRow[] = [
      makeRow({ id: 1, parent_id: null }),
      makeRow({ id: 2, parent_id: 1 }),
    ];
    const original = [...rows];

    buildMenuTree(rows);

    expect(rows).toEqual(original);
  });
});

describe('extractPermissions', () => {
  it('extracts unique permission strings', () => {
    const rows: MenuRow[] = [
      makeRow({ id: 1, permission: 'dashboard:view' }),
      makeRow({ id: 2, permission: 'dashboard:view' }),
      makeRow({ id: 3, permission: 'system:user' }),
    ];

    const perms = extractPermissions(rows);

    expect(perms).toHaveLength(2);
    expect(perms).toContain('dashboard:view');
    expect(perms).toContain('system:user');
  });

  it('skips menus without permission', () => {
    const rows: MenuRow[] = [
      makeRow({ id: 1, permission: null }),
      makeRow({ id: 2, permission: 'system:user' }),
    ];

    const perms = extractPermissions(rows);

    expect(perms).toEqual(['system:user']);
  });

  it('returns empty array when no permissions exist', () => {
    const rows: MenuRow[] = [
      makeRow({ id: 1, permission: null }),
    ];

    expect(extractPermissions(rows)).toEqual([]);
  });
});
