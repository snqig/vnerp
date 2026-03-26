import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取角色权限
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId');

    if (!roleId) {
      return NextResponse.json({
        success: false,
        message: '角色ID不能为空'
      }, { status: 400 });
    }

    const result = await query(
      'SELECT menu_id FROM sys_role_menu WHERE role_id = ?',
      [roleId]
    );

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取角色权限失败:', error);
    return NextResponse.json({
      success: false,
      message: '获取角色权限失败'
    }, { status: 500 });
  }
}

// 保存角色权限
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role_id, menu_ids } = body;

    if (!role_id) {
      return NextResponse.json({
        success: false,
        message: '角色ID不能为空'
      }, { status: 400 });
    }

    // 开始事务
    await query('START TRANSACTION');

    try {
      // 删除该角色原有的权限
      await query('DELETE FROM sys_role_menu WHERE role_id = ?', [role_id]);

      // 插入新的权限
      if (menu_ids && menu_ids.length > 0) {
        const values = menu_ids.map((menuId: number) => `(${role_id}, ${menuId})`).join(',');
        await query(`INSERT INTO sys_role_menu (role_id, menu_id) VALUES ${values}`);
      }

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        message: '权限设置成功'
      });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('保存角色权限失败:', error);
    return NextResponse.json({
      success: false,
      message: '保存角色权限失败: ' + (error as Error).message
    }, { status: 500 });
  }
}
