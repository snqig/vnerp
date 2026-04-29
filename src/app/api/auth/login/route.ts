import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
}

const SECRET_KEY = JWT_SECRET || 'dev-only-secret-key';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

function getClientIP(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const ips = xff.split(',').map(ip => ip.trim());
    return ips[0] || '127.0.0.1';
  }
  return request.headers.get('x-real-ip') || '127.0.0.1';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({
        success: false,
        message: '用户名和密码不能为空'
      }, { status: 400 });
    }

    let users: any;
    try {
      users = await query(
        'SELECT id, username, password, real_name, avatar, email, phone, department_id, status, first_login, login_fail_count, lock_time FROM sys_user WHERE username = ? AND deleted = 0',
        [username]
      );
    } catch (e: any) {
      if (e.code === 'ER_BAD_FIELD_ERROR') {
        users = await query(
          'SELECT id, username, password, real_name, avatar, email, phone, department_id, status, 1 as first_login, 0 as login_fail_count, NULL as lock_time FROM sys_user WHERE username = ? AND deleted = 0',
          [username]
        );
      } else {
        throw e;
      }
    }

    if (users.length === 0) {
      await logLogin(username, request, false, '用户名或密码错误');
      return NextResponse.json({
        success: false,
        message: '用户名或密码错误'
      }, { status: 401 });
    }

    const user = users[0];

    if (user.status === 0) {
      await logLogin(username, request, false, '账号已被禁用');
      return NextResponse.json({
        success: false,
        message: '账号已被禁用，请联系管理员'
      }, { status: 403 });
    }

    if (user.lock_time) {
      const lockTime = new Date(user.lock_time);
      const now = new Date();
      const diffMinutes = (now.getTime() - lockTime.getTime()) / (1000 * 60);
      if (diffMinutes < LOCKOUT_MINUTES) {
        const remaining = Math.ceil(LOCKOUT_MINUTES - diffMinutes);
        await logLogin(username, request, false, `账号已锁定，请${remaining}分钟后再试`);
        return NextResponse.json({
          success: false,
          message: `账号已锁定，请${remaining}分钟后再试`
        }, { status: 429 });
      } else {
        await execute(
          'UPDATE sys_user SET login_fail_count = 0, lock_time = NULL WHERE id = ?',
          [user.id]
        );
        user.login_fail_count = 0;
      }
    }

    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      const failCount = (user.login_fail_count || 0) + 1;
      if (failCount >= MAX_LOGIN_ATTEMPTS) {
        await execute(
          'UPDATE sys_user SET login_fail_count = ?, lock_time = NOW() WHERE id = ?',
          [failCount, user.id]
        );
        await logLogin(username, request, false, `密码错误次数过多，账号已锁定${LOCKOUT_MINUTES}分钟`);
        return NextResponse.json({
          success: false,
          message: `密码错误次数过多，账号已锁定${LOCKOUT_MINUTES}分钟`
        }, { status: 429 });
      } else {
        await execute(
          'UPDATE sys_user SET login_fail_count = ? WHERE id = ?',
          [failCount, user.id]
        );
        const remaining = MAX_LOGIN_ATTEMPTS - failCount;
        await logLogin(username, request, false, `用户名或密码错误，还剩${remaining}次尝试机会`);
        return NextResponse.json({
          success: false,
          message: `用户名或密码错误，还剩${remaining}次尝试机会`
        }, { status: 401 });
      }
    }

    await execute(
      'UPDATE sys_user SET login_fail_count = 0, lock_time = NULL WHERE id = ?',
      [user.id]
    );

    const userRoles = await query(
      `SELECT r.id, r.role_code, r.role_name, r.data_scope
       FROM sys_user_role ur
       JOIN sys_role r ON ur.role_id = r.id
       WHERE ur.user_id = ? AND r.status = 1`,
      [user.id]
    );

    let departmentName: string | null = null;
    if (user.department_id) {
      try {
        const deptResult: any = await query(
          'SELECT dept_name FROM sys_department WHERE id = ?',
          [user.department_id]
        );
        if (deptResult.length > 0) {
          departmentName = deptResult[0].dept_name;
        }
      } catch (e) {
        console.error('查询部门名称失败:', e);
      }
    }

    let permissions: string[] = [];
    if (userRoles.length > 0) {
      const roleIds = (userRoles as any[]).map(r => r.id);
      const placeholders = roleIds.map(() => '?').join(',');
      const perms = await query(
        `SELECT DISTINCT m.permission
         FROM sys_menu m
         JOIN sys_role_menu rm ON m.id = rm.menu_id
         WHERE rm.role_id IN (${placeholders})
         AND m.permission IS NOT NULL AND m.permission != ''`,
        roleIds
      );
      permissions = (perms as any[]).map(p => p.permission).filter(Boolean);
    }

    const token = await new SignJWT({
      userId: user.id,
      username: user.username,
      realName: user.real_name,
      roles: (userRoles as any[]).map(r => r.role_code)
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(new TextEncoder().encode(SECRET_KEY));

    try {
      await execute(
        'UPDATE sys_user SET last_login_time = NOW() WHERE id = ?',
        [user.id]
      );
    } catch (e) {
      console.error('更新最后登录时间失败:', e);
    }

    const userInfo = {
      id: user.id,
      username: user.username,
      realName: user.real_name,
      avatar: user.avatar,
      email: user.email,
      phone: user.phone,
      departmentId: user.department_id,
      departmentName,
      roles: (userRoles as any[]).map(r => ({
        id: r.id,
        role_code: r.role_code,
        role_name: r.role_name,
      })),
      permissions: [...new Set(permissions)],
      firstLogin: Number(user.first_login || 0) === 1
    };

    await logLogin(username, request, true, '登录成功');

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

async function logLogin(username: string, request: NextRequest, success: boolean, message: string) {
  try {
    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';
    await execute(
      `INSERT INTO sys_login_log (user_name, ipaddr, login_location, browser, os, status, msg)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [username, ip, '', parseBrowser(userAgent), parseOS(userAgent), success ? 1 : 0, message]
    );
  } catch (e) {
    console.error('记录登录日志失败:', e);
  }
}

function parseBrowser(ua: string): string {
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Safari/')) return 'Safari';
  return 'Unknown';
}

function parseOS(ua: string): string {
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown';
}
