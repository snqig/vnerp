import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { UserInfo } from '@/lib/api-auth';
import { withPermission } from '@/lib/api-permissions';

// 构建菜单树
function buildMenuTree(menus: Loose[], parentId: number = 0): Loose[] {
  return menus
    .filter((menu) => (menu.parent_id ?? 0) === parentId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((menu) => ({
      ...menu,
      children: buildMenuTree(menus, menu.id),
    }));
}

// 获取菜单列表
export const GET = withPermission(async (request: NextRequest, _userInfo: UserInfo) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

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
    const params: Loose[] = [];

    if (status !== null && status !== '') {
      sql += ' AND status = ?';
      params.push(parseInt(status));
    }

    sql += ' ORDER BY sort_order ASC';

    const menus = await query(sql, params);

    // 构建树形结构
    const menuTree = buildMenuTree(menus as Loose[]);

    return successResponse(menuTree, '获取菜单列表成功');
  } catch {
    return errorResponse('获取菜单列表失败', 500);
  }
});
