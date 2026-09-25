import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { UserInfo } from '@/lib/api-auth';
import { withPermission } from '@/lib/api-permissions';
import type { DbRow, DbValue } from '@/types/db';
import { numericFilter } from '@/lib/query-filter';

interface MenuNode {
  [key: string]: DbValue | MenuNode[];
  children: MenuNode[];
}

// 构建菜单树
function buildMenuTree(menus: DbRow[], parentId: number = 0): MenuNode[] {
  return menus
    .filter((menu) => Number(menu.parent_id ?? 0) === Number(parentId))
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
    .map((menu) => ({
      ...menu,
      children: buildMenuTree(menus, Number(menu.id)),
    }));
}

// 获取菜单列表
export const GET = withPermission(async (request: NextRequest, _userInfo: UserInfo) => {
  const ts = await getTranslations('Common');
  try {
    const { searchParams } = new URL(request.url);
    const status = numericFilter(searchParams.get('status'));

    let sql = `
      SELECT 
        id,
        menu_name,
        menu_code,
        parent_id,
        path,
        icon,
        sort_order,
        status,
        permission,
        component,
        is_cache as keep_alive,
        is_visible as hidden,
        create_time,
        update_time
      FROM sys_menu
      WHERE status = 1
    `;
    const params: SqlValue[] = [];

    if (status !== undefined) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY sort_order ASC';

    const menus = await query(sql, params);

    // 构建树形结构
    const menuTree = buildMenuTree(menus as DbRow[]);

    return successResponse(menuTree, ts('k_1rqbgy9'));
  } catch {
    return errorResponse(ts('k_1bwkshy'), 500);
  }
});
