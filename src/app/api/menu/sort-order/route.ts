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

// 保存菜单排序
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { orders } = body;

    if (!Array.isArray(orders)) {
      return NextResponse.json({
        success: false,
        message: '参数错误'
      }, { status: 400 });
    }

    // 更新每个菜单的排序
    for (const item of orders) {
      await query(
        'UPDATE sys_menu SET sort_order = ? WHERE id = ?',
        [item.sort_order, item.id]
      );
    }

    return NextResponse.json({
      success: true,
      message: '菜单排序已保存'
    });

  } catch (error) {
    console.error('保存菜单排序失败:', error);
    return NextResponse.json({
      success: false,
      message: '保存菜单排序失败'
    }, { status: 500 });
  }
}
