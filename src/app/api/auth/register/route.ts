import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 密码加密
async function hashPassword(password: string): Promise<string> {
  const bcrypt = require('bcryptjs');
  return await bcrypt.hash(password, 10);
}

// 用户注册
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      username,
      password,
      real_name,
      email,
      phone,
      department_id,
      role_id
    } = body;

    // 验证必填字段
    if (!username || !password) {
      return NextResponse.json({
        success: false,
        message: '用户名和密码不能为空'
      }, { status: 400 });
    }

    // 验证用户名格式
    if (!/^[a-zA-Z0-9_]{4,20}$/.test(username)) {
      return NextResponse.json({
        success: false,
        message: '用户名只能包含字母、数字和下划线，长度4-20位'
      }, { status: 400 });
    }

    // 验证密码强度
    if (password.length < 6) {
      return NextResponse.json({
        success: false,
        message: '密码长度不能少于6位'
      }, { status: 400 });
    }

    // 检查用户名是否已存在
    const existingUser = await query(
      'SELECT id FROM sys_user WHERE username = ? AND deleted = 0',
      [username]
    );

    if (existingUser.length > 0) {
      return NextResponse.json({
        success: false,
        message: '用户名已存在'
      }, { status: 400 });
    }

    // 检查邮箱是否已存在
    if (email) {
      const existingEmail = await query(
        'SELECT id FROM sys_user WHERE email = ? AND deleted = 0',
        [email]
      );
      if (existingEmail.length > 0) {
        return NextResponse.json({
          success: false,
          message: '邮箱已被注册'
        }, { status: 400 });
      }
    }

    // 加密密码
    const hashedPassword = await hashPassword(password);

    // 创建用户
    const result = await query(
      `INSERT INTO sys_user (username, password, real_name, email, phone, department_id, status, create_time)
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`,
      [username, hashedPassword, real_name || null, email || null, phone || null, department_id || null]
    );

    const userId = (result as any).insertId;

    // 如果指定了角色，绑定角色
    if (role_id) {
      await query(
        'INSERT INTO sys_user_role (user_id, role_id) VALUES (?, ?)',
        [userId, role_id]
      );
    } else {
      // 默认绑定普通员工角色
      const defaultRole = await query(
        "SELECT id FROM sys_role WHERE role_code = 'operator' LIMIT 1"
      );
      if (defaultRole.length > 0) {
        await query(
          'INSERT INTO sys_user_role (user_id, role_id) VALUES (?, ?)',
          [userId, (defaultRole as any)[0].id]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: '注册成功',
      data: { userId }
    });

  } catch (error) {
    console.error('注册失败:', error);
    return NextResponse.json({
      success: false,
      message: '注册失败，请稍后重试'
    }, { status: 500 });
  }
}
