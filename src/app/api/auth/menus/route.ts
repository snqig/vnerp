import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 验证JWT Token
async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(JWT_SECRET)
    );
    return payload;
  } catch {
    return null;
  }
}

// 获取用户菜单
export async function GET(request: NextRequest) {
  try {
    // 获取token
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({
        success: false,
        message: '未登录'
      }, { status: 401 });
    }

    // 验证token
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({
        success: false,
        message: '登录已过期'
      }, { status: 401 });
    }

    const userId = payload.userId as number;

    // 查询用户角色
    const userRoles = await query(
      `SELECT r.id, r.role_code, r.role_name, r.data_scope
       FROM sys_user_role ur
       JOIN sys_role r ON ur.role_id = r.id
       WHERE ur.user_id = ? AND r.status = 1`,
      [userId]
    );

    // 如果没有角色，返回空菜单
    if (userRoles.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        permissions: []
      });
    }

    const roleIds = (userRoles as any[]).map(r => r.id);

    // 查询角色拥有的菜单
    const menus = await query(
      `SELECT DISTINCT m.*
       FROM sys_menu m
       JOIN sys_role_menu rm ON m.id = rm.menu_id
       WHERE rm.role_id IN (${roleIds.join(',')})
       AND m.status = 1
       AND m.is_visible = 1
       ORDER BY m.sort_order ASC, m.id ASC`,
    );

    // 构建菜单树
    const menuTree = buildMenuTree(menus as any[]);

    // 获取所有权限标识
    const permissions = (menus as any[])
      .filter(m => m.permission)
      .map(m => m.permission);

    return NextResponse.json({
      success: true,
      data: menuTree,
      permissions: [...new Set(permissions)], // 去重
      roles: userRoles
    });

  } catch (error) {
    console.error('获取菜单失败:', error);
    return NextResponse.json({
      success: false,
      message: '获取菜单失败'
    }, { status: 500 });
  }
}

// 构建菜单树
function buildMenuTree(menus: any[], parentId: number = 0): any[] {
  const tree: any[] = [];

  for (const menu of menus) {
    if (menu.parent_id === parentId) {
      const children = buildMenuTree(menus, menu.id);
      const menuItem = {
        id: menu.id,
        name: menu.menu_name,
        code: menu.menu_code,
        type: menu.menu_type,
        icon: menu.icon,
        path: menu.path,
        component: menu.component,
        permission: menu.permission,
        sortOrder: menu.sort_order,
        children: children.length > 0 ? children : undefined
      };
      tree.push(menuItem);
    }
  }

  return tree;
}
