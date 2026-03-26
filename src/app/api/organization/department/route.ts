import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取部门列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const status = searchParams.get('status');

    let sql = 'SELECT * FROM sys_department WHERE deleted = 0';
    const params: any[] = [];

    if (keyword) {
      sql += ' AND (dept_name LIKE ? OR dept_code LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (status !== null && status !== undefined && status !== '') {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY sort_order ASC, id ASC';

    const result = await query(sql, params);
    
    // 转换字段名以匹配前端期望
    const formattedResult = result.map((dept: any) => ({
      id: dept.id,
      dept_code: dept.dept_code,
      dept_name: dept.dept_name,
      parent_id: dept.parent_id,
      manager_name: dept.leader_id,
      sort_order: dept.sort_order,
      description: dept.description,
      status: dept.status,
      create_time: dept.create_time,
      update_time: dept.update_time
    }));

    return NextResponse.json({
      success: true,
      data: formattedResult
    });
  } catch (error) {
    console.error('获取部门列表失败:', error);
    return NextResponse.json({
      success: false,
      message: '获取部门列表失败'
    }, { status: 500 });
  }
}

// 创建部门
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      code,
      name,
      parent_id,
      manager_name,
      sort_order,
      description,
      status
    } = body;

    // 检查编码是否已存在
    const existing = await query('SELECT id FROM sys_department WHERE dept_code = ?', [code]);
    if (existing.length > 0) {
      return NextResponse.json({
        success: false,
        message: '部门编码已存在'
      }, { status: 400 });
    }

    await query(`
      INSERT INTO sys_department (dept_code, dept_name, parent_id, sort_order, status)
      VALUES (?, ?, ?, ?, ?)
    `, [code, name, parent_id || 0, sort_order || 0, status ?? 1]);

    return NextResponse.json({
      success: true,
      message: '部门创建成功'
    });
  } catch (error) {
    console.error('创建部门失败:', error);
    return NextResponse.json({
      success: false,
      message: '创建部门失败'
    }, { status: 500 });
  }
}

// 更新部门
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      code,
      name,
      parent_id,
      manager_name,
      sort_order,
      description,
      status
    } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        message: '部门ID不能为空'
      }, { status: 400 });
    }

    // 检查编码是否已被其他部门使用
    const existing = await query('SELECT id FROM sys_department WHERE dept_code = ? AND id != ?', [code, id]);
    if (existing.length > 0) {
      return NextResponse.json({
        success: false,
        message: '部门编码已存在'
      }, { status: 400 });
    }

    await query(`
      UPDATE sys_department SET
        dept_code = ?,
        dept_name = ?,
        parent_id = ?,
        sort_order = ?,
        status = ?
      WHERE id = ?
    `, [code, name, parent_id || 0, sort_order || 0, status, id]);

    return NextResponse.json({
      success: true,
      message: '部门更新成功'
    });
  } catch (error) {
    console.error('更新部门失败:', error);
    return NextResponse.json({
      success: false,
      message: '更新部门失败'
    }, { status: 500 });
  }
}

// 删除部门
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        message: '部门ID不能为空'
      }, { status: 400 });
    }

    // 软删除
    await query('UPDATE sys_department SET deleted = 1 WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: '部门删除成功'
    });
  } catch (error) {
    console.error('删除部门失败:', error);
    return NextResponse.json({
      success: false,
      message: '删除部门失败'
    }, { status: 500 });
  }
}
