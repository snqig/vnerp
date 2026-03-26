import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取所有菜单
export async function GET(request: NextRequest) {
  try {
    const menus = await query(
      'SELECT * FROM sys_menu WHERE status = 1 ORDER BY sort_order ASC, id ASC'
    );

    return NextResponse.json({
      success: true,
      data: menus
    });
  } catch (error) {
    console.error('获取菜单失败:', error);
    return NextResponse.json({
      success: false,
      message: '获取菜单失败'
    }, { status: 500 });
  }
}

// 创建菜单
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      parent_id,
      menu_name,
      menu_code,
      menu_type,
      icon,
      path,
      component,
      permission,
      sort_order,
      is_visible
    } = body;

    // 验证必填字段
    if (!menu_name || !menu_code) {
      return NextResponse.json({
        success: false,
        message: '菜单名称和编码不能为空'
      }, { status: 400 });
    }

    // 检查菜单编码是否已存在
    const existing = await query(
      'SELECT id FROM sys_menu WHERE menu_code = ?',
      [menu_code]
    );

    if ((existing as any[]).length > 0) {
      return NextResponse.json({
        success: false,
        message: '菜单编码已存在'
      }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO sys_menu (parent_id, menu_name, menu_code, menu_type, icon, path, component, permission, sort_order, is_visible, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [parent_id || 0, menu_name, menu_code, menu_type || 1, icon, path, component, permission, sort_order || 0, is_visible ?? 1]
    );

    return NextResponse.json({
      success: true,
      message: '菜单创建成功',
      data: { id: (result as any).insertId }
    });
  } catch (error) {
    console.error('创建菜单失败:', error);
    return NextResponse.json({
      success: false,
      message: '创建菜单失败'
    }, { status: 500 });
  }
}

// 更新菜单
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      parent_id,
      menu_name,
      menu_code,
      menu_type,
      icon,
      path,
      component,
      permission,
      sort_order,
      is_visible,
      status
    } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        message: '菜单ID不能为空'
      }, { status: 400 });
    }

    await query(
      `UPDATE sys_menu SET
        parent_id = ?, menu_name = ?, menu_code = ?, menu_type = ?,
        icon = ?, path = ?, component = ?, permission = ?,
        sort_order = ?, is_visible = ?, status = ?
       WHERE id = ?`,
      [parent_id || 0, menu_name, menu_code, menu_type, icon, path, component, permission, sort_order, is_visible, status, id]
    );

    return NextResponse.json({
      success: true,
      message: '菜单更新成功'
    });
  } catch (error) {
    console.error('更新菜单失败:', error);
    return NextResponse.json({
      success: false,
      message: '更新菜单失败'
    }, { status: 500 });
  }
}

// 删除菜单
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        message: '菜单ID不能为空'
      }, { status: 400 });
    }

    // 检查是否有子菜单
    const children = await query(
      'SELECT id FROM sys_menu WHERE parent_id = ?',
      [id]
    );

    if ((children as any[]).length > 0) {
      return NextResponse.json({
        success: false,
        message: '请先删除子菜单'
      }, { status: 400 });
    }

    await query('DELETE FROM sys_menu WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: '菜单删除成功'
    });
  } catch (error) {
    console.error('删除菜单失败:', error);
    return NextResponse.json({
      success: false,
      message: '删除菜单失败'
    }, { status: 500 });
  }
}
