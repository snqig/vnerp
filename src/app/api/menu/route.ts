import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';

// 构建菜单树
function buildMenuTree(menus: any[], parentId: number = 0): any[] {
  return menus
    .filter(menu => menu.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(menu => ({
      ...menu,
      children: buildMenuTree(menus, menu.id)
    }));
}

// 获取菜单列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let sql = `
      SELECT 
        id,
        menu_name,
        parent_id,
        path,
        icon,
        sort_order,
        status,
        permission,
        component,
        keep_alive,
        hidden,
        create_time,
        update_time
      FROM sys_menu
      WHERE deleted = 0
    `;
    const params: any[] = [];

    if (status !== null && status !== '') {
      sql += ' AND status = ?';
      params.push(parseInt(status));
    }

    sql += ' ORDER BY sort_order ASC';

    const menus = await query(sql, params);

    // 构建树形结构
    const menuTree = buildMenuTree(menus as any[]);

    return successResponse(menuTree, '获取菜单列表成功');
  } catch (error) {
    console.error('获取菜单列表失败:', error);
    return errorResponse('获取菜单列表失败', 500);
  }
}
