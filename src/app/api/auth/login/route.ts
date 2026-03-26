import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { SignJWT } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 密码验证函数 (bcrypt compare)
async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(password, hashedPassword);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // 验证参数
    if (!username || !password) {
      return NextResponse.json({
        success: false,
        message: '用户名和密码不能为空'
      }, { status: 400 });
    }

    // 查询用户 - 使用实际存在的字段
    const users = await query(
      `SELECT id, username, password, real_name, avatar, email, phone, department_id, status
       FROM sys_user WHERE username = ? AND deleted = 0`,
      [username]
    );

    if (users.length === 0) {
      return NextResponse.json({
        success: false,
        message: '用户名或密码错误'
      }, { status: 401 });
    }

    const user = users[0];

    // 检查账号是否被禁用
    if (user.status === 0) {
      return NextResponse.json({
        success: false,
        message: '账号已被禁用，请联系管理员'
      }, { status: 403 });
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({
        success: false,
        message: '用户名或密码错误'
      }, { status: 401 });
    }

    // 查询用户角色
    const userRoles = await query(
      `SELECT r.id, r.role_code, r.role_name, r.data_scope, d.dept_name as department_name
       FROM sys_user_role ur
       JOIN sys_role r ON ur.role_id = r.id
       LEFT JOIN sys_department d ON ? = d.id
       WHERE ur.user_id = ? AND r.status = 1`,
      [user.department_id, user.id]
    );

    // 查询用户权限
    let permissions: string[] = [];
    if (userRoles.length > 0) {
      const roleIds = (userRoles as any[]).map(r => r.id);
      const perms = await query(
        `SELECT DISTINCT m.permission
         FROM sys_menu m
         JOIN sys_role_menu rm ON m.id = rm.menu_id
         WHERE rm.role_id IN (${roleIds.join(',')})
         AND m.permission IS NOT NULL AND m.permission != ''`
      );
      permissions = (perms as any[]).map(p => p.permission);
    }

    // 生成 JWT Token
    const token = await new SignJWT({
      userId: user.id,
      username: user.username,
      realName: user.real_name,
      roles: (userRoles as any[]).map(r => r.role_code)
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(new TextEncoder().encode(JWT_SECRET));

    // 返回用户信息 (不包含密码)
    const userInfo = {
      id: user.id,
      username: user.username,
      realName: user.real_name,
      avatar: user.avatar,
      email: user.email,
      phone: user.phone,
      departmentId: user.department_id,
      departmentName: (userRoles as any[])[0]?.department_name || null,
      roles: userRoles,
      permissions: [...new Set(permissions)]
    };

    return NextResponse.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: userInfo
      }
    });

  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json({
      success: false,
      message: '登录失败，请稍后重试'
    }, { status: 500 });
  }
}
