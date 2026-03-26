import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取员工列表或单个员工
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const keyword = searchParams.get('keyword') || '';
    const dept_id = searchParams.get('dept_id');
    const role_id = searchParams.get('role_id');
    const status = searchParams.get('status');

    // 如果提供了ID，查询单个员工
    if (id) {
      const sql = 'SELECT * FROM sys_employee WHERE id = ?';
      const result = await query(sql, [id]);
      
      if (result.length === 0) {
        return NextResponse.json({
          success: false,
          message: '员工不存在'
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: result[0]
      });
    }

    // 否则查询列表
    let sql = 'SELECT * FROM sys_employee WHERE 1=1';
    const params: any[] = [];

    if (keyword) {
      sql += ' AND (name LIKE ? OR employee_no LIKE ? OR phone LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    if (dept_id) {
      sql += ' AND dept_id = ?';
      params.push(dept_id);
    }

    if (role_id) {
      sql += ' AND role_id = ?';
      params.push(role_id);
    }

    if (status !== null && status !== undefined && status !== '') {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY id DESC';

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取员工列表失败:', error);
    return NextResponse.json({
      success: false,
      message: '获取员工列表失败'
    }, { status: 500 });
  }
}

// 创建员工
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employee_no,
      name,
      gender,
      age,
      id_card,
      phone,
      email,
      dept_id,
      dept_name,
      section,
      role_id,
      role_name,
      position,
      entry_date,
      birth_date,
      native_place,
      home_address,
      current_address,
      birth_month,
      id_card_expiry,
      education,
      remark,
      status,
      photo
    } = body;

    // 验证必填字段
    if (!employee_no || !name) {
      return NextResponse.json({
        success: false,
        message: '员工编号和姓名不能为空'
      }, { status: 400 });
    }

    // 检查员工编号是否已存在
    const existing = await query('SELECT id FROM sys_employee WHERE employee_no = ?', [employee_no]);
    if (existing.length > 0) {
      return NextResponse.json({
        success: false,
        message: '员工编号已存在'
      }, { status: 400 });
    }

    await query(`
      INSERT INTO sys_employee (
        employee_no, name, gender, age, id_card, phone, email,
        dept_id, dept_name, section, role_id, role_name, position, entry_date,
        birth_date, native_place, home_address, current_address, birth_month, id_card_expiry, education, remark, status, photo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      employee_no,
      name,
      gender || 1,
      age || null,
      id_card || null,
      phone || null,
      email || null,
      dept_id || null,
      dept_name || null,
      section || null,
      role_id || null,
      role_name || null,
      position || null,
      entry_date || null,
      birth_date || null,
      native_place || null,
      home_address || null,
      current_address || null,
      birth_month || null,
      id_card_expiry || null,
      education || null,
      remark || null,
      status ?? 1,
      photo || null
    ]);

    return NextResponse.json({
      success: true,
      message: '员工创建成功'
    });
  } catch (error) {
    console.error('创建员工失败:', error);
    return NextResponse.json({
      success: false,
      message: '创建员工失败: ' + (error as Error).message
    }, { status: 500 });
  }
}

// 更新员工
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      employee_no,
      name,
      gender,
      age,
      id_card,
      phone,
      email,
      dept_id,
      dept_name,
      section,
      role_id,
      role_name,
      position,
      entry_date,
      birth_date,
      native_place,
      home_address,
      current_address,
      birth_month,
      id_card_expiry,
      education,
      remark,
      status,
      photo
    } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        message: '员工ID不能为空'
      }, { status: 400 });
    }

    // 验证必填字段
    if (!employee_no || !name) {
      return NextResponse.json({
        success: false,
        message: '员工编号和姓名不能为空'
      }, { status: 400 });
    }

    // 检查员工编号是否已被其他员工使用
    const existing = await query('SELECT id FROM sys_employee WHERE employee_no = ? AND id != ?', [employee_no, id]);
    if (existing.length > 0) {
      return NextResponse.json({
        success: false,
        message: '员工编号已存在'
      }, { status: 400 });
    }

    await query(`
      UPDATE sys_employee SET
        employee_no = ?,
        name = ?,
        gender = ?,
        age = ?,
        id_card = ?,
        phone = ?,
        email = ?,
        dept_id = ?,
        dept_name = ?,
        section = ?,
        role_id = ?,
        role_name = ?,
        position = ?,
        entry_date = ?,
        birth_date = ?,
        native_place = ?,
        home_address = ?,
        current_address = ?,
        birth_month = ?,
        id_card_expiry = ?,
        education = ?,
        remark = ?,
        status = ?,
        photo = ?
      WHERE id = ?
    `, [
      employee_no,
      name,
      gender || 1,
      age || null,
      id_card || null,
      phone || null,
      email || null,
      dept_id || null,
      dept_name || null,
      section || null,
      role_id || null,
      role_name || null,
      position || null,
      entry_date || null,
      birth_date || null,
      native_place || null,
      home_address || null,
      current_address || null,
      birth_month || null,
      id_card_expiry || null,
      education || null,
      remark || null,
      status,
      photo || null,
      id
    ]);

    return NextResponse.json({
      success: true,
      message: '员工更新成功'
    });
  } catch (error) {
    console.error('更新员工失败:', error);
    return NextResponse.json({
      success: false,
      message: '更新员工失败: ' + (error as Error).message
    }, { status: 500 });
  }
}

// 删除员工
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        message: '员工ID不能为空'
      }, { status: 400 });
    }

    await query('DELETE FROM sys_employee WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: '员工删除成功'
    });
  } catch (error) {
    console.error('删除员工失败:', error);
    return NextResponse.json({
      success: false,
      message: '删除员工失败'
    }, { status: 500 });
  }
}
