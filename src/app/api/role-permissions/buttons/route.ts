import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取角色的按钮权限
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
      'SELECT permissions FROM sys_role WHERE id = ?',
      [roleId]
    );

    if (result.length === 0) {
      return NextResponse.json({
        success: false,
        message: '角色不存在'
      }, { status: 404 });
    }

    const permissions = result[0].permissions ? JSON.parse(result[0].permissions) : [];

    return NextResponse.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('获取按钮权限失败:', error);
    return NextResponse.json({
      success: false,
      message: '获取按钮权限失败'
    }, { status: 500 });
  }
}

// 保存角色的按钮权限
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role_id, permissions } = body;

    if (!role_id) {
      return NextResponse.json({
        success: false,
        message: '角色ID不能为空'
      }, { status: 400 });
    }

    await query(
      'UPDATE sys_role SET permissions = ? WHERE id = ?',
      [JSON.stringify(permissions || []), role_id]
    );

    return NextResponse.json({
      success: true,
      message: '按钮权限保存成功'
    });
  } catch (error) {
    console.error('保存按钮权限失败:', error);
    return NextResponse.json({
      success: false,
      message: '保存按钮权限失败: ' + (error as Error).message
    }, { status: 500 });
  }
}
