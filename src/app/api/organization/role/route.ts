import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取角色列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const status = searchParams.get('status');

    let sql = 'SELECT * FROM sys_role WHERE deleted = 0';
    const params: any[] = [];

    if (keyword) {
      sql += ' AND (role_name LIKE ? OR role_code LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (status !== null && status !== undefined && status !== '') {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY id ASC';

    const result = await query(sql, params);

    // 转换字段名以匹配前端期望
    const formattedResult = result.map((role: any) => ({
      id: role.id,
      code: role.role_code,
      name: role.role_name,
      role_code: role.role_code,
      role_name: role.role_name,
      description: role.description,
      data_scope: role.data_scope,
      status: role.status,
      permissions: role.permissions ? JSON.parse(role.permissions) : [],
      create_time: role.create_time,
      update_time: role.update_time
    }));

    return NextResponse.json({
      success: true,
      data: formattedResult
    });
  } catch (error) {
    console.error('获取角色列表失败:', error);
    return NextResponse.json({
      success: false,
      message: '获取角色列表失败'
    }, { status: 500 });
  }
}

// 创建角色
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      role_code,
      role_name,
      description,
      status
    } = body;

    // 检查编码是否已存在
    const existing = await query('SELECT id FROM sys_role WHERE role_code = ?', [role_code]);
    if (existing.length > 0) {
      return NextResponse.json({
        success: false,
        message: '角色编码已存在'
      }, { status: 400 });
    }

    await query(`
      INSERT INTO sys_role (role_code, role_name, description, status)
      VALUES (?, ?, ?, ?)
    `, [
      role_code,
      role_name,
      description,
      status ?? 1
    ]);

    return NextResponse.json({
      success: true,
      message: '角色创建成功'
    });
  } catch (error) {
    console.error('创建角色失败:', error);
    return NextResponse.json({
      success: false,
      message: '创建角色失败'
    }, { status: 500 });
  }
}

// 更新角色
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      role_code,
      role_name,
      description,
      status
    } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        message: '角色ID不能为空'
      }, { status: 400 });
    }

    await query(`
      UPDATE sys_role SET
        role_name = ?,
        description = ?,
        status = ?
      WHERE id = ?
    `, [
      role_name,
      description,
      status,
      id
    ]);

    return NextResponse.json({
      success: true,
      message: '角色更新成功'
    });
  } catch (error) {
    console.error('更新角色失败:', error);
    return NextResponse.json({
      success: false,
      message: '更新角色失败'
    }, { status: 500 });
  }
}

// 删除角色
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        message: '角色ID不能为空'
      }, { status: 400 });
    }

    // 软删除
    await query('UPDATE sys_role SET deleted = 1 WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: '角色删除成功'
    });
  } catch (error) {
    console.error('删除角色失败:', error);
    return NextResponse.json({
      success: false,
      message: '删除角色失败'
    }, { status: 500 });
  }
}
