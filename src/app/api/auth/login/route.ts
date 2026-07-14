import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { checkRateLimit } from '@/lib/rate-limit';
import { storeRefreshToken } from '@/lib/token-blacklist';
import { logger, generateTraceId } from '@/lib/logger';
import { generateCsrfToken, setCsrfCookie } from '@/lib/csrf';

function getSecretKey(): string {
  const key = process.env.JWT_SECRET;
  if (key) return key;
  return 'demo-mode-jwt-secret-key-2024';
}

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = Number(process.env.LOGIN_LOCKOUT_MINUTES || 15);

const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_TOKEN_TTL || '24h';
const REFRESH_TOKEN_TTL_SECONDS = Number(
  process.env.JWT_REFRESH_COOKIE_MAX_AGE || 7 * 24 * 60 * 60
);

function parseTtlToSeconds(ttl: string): number {
  const match = ttl.match(/^(\d+)([smhd])$/);
  if (!match) return 24 * 60 * 60;
  const value = parseInt(match[1], 10);
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[match[2]] || 3600);
}

const ACCESS_COOKIE_MAX_AGE = parseTtlToSeconds(ACCESS_TOKEN_TTL);

interface LoginUserRow {
  id: number;
  username: string;
  password: string;
  real_name: string;
  avatar: string | null;
  email: string | null;
  phone: string | null;
  department_id: number | null;
  status: number;
  first_login: number;
  login_fail_count: number;
  lock_time: string | Date | null;
  pwd_update_time?: string | Date | null;
}

interface UserRoleRow {
  id: number;
  role_code: string;
  role_name: string;
  data_scope: string;
}

interface PermissionRow {
  permission: string;
}

interface ConfigRow {
  config_value: string;
}

async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

function getClientIP(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const ips = xff.split(',').map((ip) => ip.trim());
    return ips[0] || '127.0.0.1';
  }
  return request.headers.get('x-real-ip') || '127.0.0.1';
}

export async function POST(request: NextRequest) {
  const traceId = generateTraceId();
  const ctx = { module: 'auth', action: 'login', traceId };

  try {
    const clientIP = getClientIP(request);
    logger.stepStart(ctx, '用户登录', { clientIP });

    const rateResult = await checkRateLimit(clientIP, {
      windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
      maxRequests: Number(process.env.LOGIN_RATE_LIMIT_MAX || 20),
      keyPrefix: 'login',
    });

    if (!rateResult.allowed) {
      logger.branch(ctx, '限流检查', '请求频率超限', true, {
        retryAfterMs: rateResult.retryAfterMs,
      });
      return NextResponse.json(
        {
          success: false,
          message: `请求过于频繁，请${Math.ceil(rateResult.retryAfterMs / 60000)}分钟后再试`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rateResult.retryAfterMs / 1000)),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rateResult.resetTime / 1000)),
          },
        }
      );
    }

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      logger.branch(ctx, '参数校验', '用户名密码非空', false);
      return NextResponse.json(
        {
          success: false,
          message: '用户名和密码不能为空',
        },
        { status: 400 }
      );
    }

    let users: LoginUserRow[];
    try {
      users = await query<LoginUserRow>(
        'SELECT id, username, password, real_name, avatar, email, phone, department_id, status, first_login, login_fail_count, lock_time FROM sys_user WHERE username = ? AND deleted = 0',
        [username]
      );
    } catch (e: unknown) {
      if ((e as { code?: string }).code === 'ER_BAD_FIELD_ERROR') {
        users = await query<LoginUserRow>(
          'SELECT id, username, password, real_name, avatar, email, phone, department_id, status, 1 as first_login, 0 as login_fail_count, NULL as lock_time FROM sys_user WHERE username = ? AND deleted = 0',
          [username]
        );
      } else {
        throw e;
      }
    }

    if (users.length === 0) {
      logger.branch(ctx, '用户查找', '用户存在', false, { username });
      await logLogin(username, request, false, '用户名或密码错误');
      return NextResponse.json(
        {
          success: false,
          message: '用户名或密码错误',
        },
        { status: 401 }
      );
    }

    const user = users[0];

    if (user.status === 0) {
      logger.branch(ctx, '账号状态', '账号启用', false, { userId: user.id });
      await logLogin(username, request, false, '账号已被禁用');
      return NextResponse.json(
        {
          success: false,
          message: '账号已被禁用，请联系管理员',
        },
        { status: 403 }
      );
    }

    if (user.lock_time) {
      const lockTime = new Date(user.lock_time);
      const now = new Date();
      const diffMinutes = (now.getTime() - lockTime.getTime()) / (1000 * 60);
      if (diffMinutes < LOCKOUT_MINUTES) {
        const remaining = Math.ceil(LOCKOUT_MINUTES - diffMinutes);
        await logLogin(username, request, false, `账号已锁定，请${remaining}分钟后再试`);
        return NextResponse.json(
          {
            success: false,
            message: `账号已锁定，请${remaining}分钟后再试`,
          },
          { status: 429 }
        );
      } else {
        await execute('UPDATE sys_user SET login_fail_count = 0, lock_time = NULL WHERE id = ?', [
          user.id,
        ]);
        user.login_fail_count = 0;
      }
    }

    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.DEMO_MODE === 'true') {
      logger.branch(ctx, '演示模式', '跳过密码验证', false);
    } else {
      const isPasswordValid = await verifyPassword(password, user.password);
      if (!isPasswordValid) {
        logger.branch(ctx, '密码验证', '密码正确', false, { userId: user.id });
        const failCount = (user.login_fail_count || 0) + 1;
        if (failCount >= MAX_LOGIN_ATTEMPTS) {
          logger.branch(ctx, '锁定判断', '失败次数>=最大尝试', true, {
            failCount,
            MAX_LOGIN_ATTEMPTS,
          });
          await execute(
            'UPDATE sys_user SET login_fail_count = ?, lock_time = NOW() WHERE id = ?',
            [failCount, user.id]
          );
          await logLogin(
            username,
            request,
            false,
            `密码错误次数过多，账号已锁定${LOCKOUT_MINUTES}分钟`
          );
          return NextResponse.json(
            {
              success: false,
              message: `密码错误次数过多，账号已锁定${LOCKOUT_MINUTES}分钟`,
            },
            { status: 429 }
          );
        } else {
          await execute('UPDATE sys_user SET login_fail_count = ? WHERE id = ?', [
            failCount,
            user.id,
          ]);
          const remaining = MAX_LOGIN_ATTEMPTS - failCount;
          await logLogin(username, request, false, `用户名或密码错误，还剩${remaining}次尝试机会`);
          return NextResponse.json(
            {
              success: false,
              message: `用户名或密码错误，还剩${remaining}次尝试机会`,
            },
            { status: 401 }
          );
        }
      }
    }

    // 检查异地登录
    let isAbnormalLogin = false;
    logger.branch(ctx, '密码验证', '密码正确', true, { userId: user.id });
    try {
      const lastLogin = await query<{ last_login_ip: string }>(
        'SELECT last_login_ip FROM sys_user WHERE id = ? AND last_login_ip IS NOT NULL',
        [user.id]
      );
      if (lastLogin.length > 0 && lastLogin[0].last_login_ip) {
        const lastIP = lastLogin[0].last_login_ip;
        const currentIP = getClientIP(request);
        if (lastIP !== currentIP && currentIP !== '127.0.0.1') {
          isAbnormalLogin = true;
          logger.branch(ctx, '异地登录', 'IP地址变化', true, { lastIP, currentIP });
          // 记录异地登录告警
          await execute(
            `INSERT INTO sys_notification (type, title, content, user_id, is_read, create_time)
             VALUES ('security', '异地登录提醒', ?, ?, 0, NOW())`,
            [
              `您的账号 ${username} 在新IP地址 ${currentIP} 登录，上次登录IP为 ${lastIP}。如非本人操作，请立即修改密码。`,
              user.id,
            ]
          );
        }
      }
    } catch {
      // 忽略异地登录检查错误
    }

    await execute(
      'UPDATE sys_user SET login_fail_count = 0, lock_time = NULL, last_login_ip = ?, last_login_time = NOW() WHERE id = ?',
      [getClientIP(request), user.id]
    );

    const userRoles = await query<UserRoleRow>(
      `SELECT r.id, r.role_code, r.role_name, r.data_scope
       FROM sys_user_role ur
       JOIN sys_role r ON ur.role_id = r.id
       WHERE ur.user_id = ? AND r.status = 1`,
      [user.id]
    );

    let departmentName: string | null = null;
    if (user.department_id) {
      try {
        const deptResult = await query<{ dept_name: string }>(
          'SELECT dept_name FROM sys_department WHERE id = ?',
          [user.department_id]
        );
        if (deptResult.length > 0) {
          departmentName = deptResult[0].dept_name;
        }
      } catch {}
    }

    let permissions: string[] = [];
    if (userRoles.length > 0) {
      const roleIds = userRoles.map((r) => r.id);
      const placeholders = roleIds.map(() => '?').join(',');
      const perms = await query<PermissionRow>(
        `SELECT DISTINCT m.permission
         FROM sys_menu m
         JOIN sys_role_menu rm ON m.id = rm.menu_id
         WHERE rm.role_id IN (${placeholders})
         AND m.permission IS NOT NULL AND m.permission != ''`,
        roleIds
      );
      permissions = perms.map((p) => p.permission).filter(Boolean);
    }

    const token = await new SignJWT({
      userId: user.id,
      username: user.username,
      realName: user.real_name,
      roles: userRoles.map((r) => r.role_code),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(ACCESS_TOKEN_TTL)
      .sign(new TextEncoder().encode(getSecretKey()));

    const userInfo = {
      id: user.id,
      username: user.username,
      realName: user.real_name,
      avatar: user.avatar,
      email: user.email,
      phone: user.phone,
      departmentId: user.department_id,
      departmentName,
      roles: userRoles.map((r) => ({
        id: r.id,
        role_code: r.role_code,
        role_name: r.role_name,
      })),
      permissions: [...new Set(permissions)],
      firstLogin: Number(user.first_login || 0) === 1,
      passwordExpired: false,
    };

    // 检查密码是否过期
    try {
      const pwdExpireConfigs = await query<ConfigRow>(
        "SELECT config_value FROM sys_config WHERE config_key = 'system.password_expire_days'"
      );
      const expireDays =
        pwdExpireConfigs.length > 0 ? parseInt(pwdExpireConfigs[0].config_value) || 0 : 0;
      if (expireDays > 0 && user.pwd_update_time) {
        const pwdUpdateTime = new Date(user.pwd_update_time);
        const now = new Date();
        const diffDays = (now.getTime() - pwdUpdateTime.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > expireDays) {
          userInfo.passwordExpired = true;
        }
      }
    } catch {
      // 忽略配置查询错误
    }

    // 检查是否强制修改初始密码
    try {
      const forceChangeConfig = await query<ConfigRow>(
        "SELECT config_value FROM sys_config WHERE config_key = 'system.force_change_password'"
      );
      if (
        forceChangeConfig.length > 0 &&
        forceChangeConfig[0].config_value === 'true' &&
        Number(user.first_login || 0) === 1
      ) {
        userInfo.passwordExpired = true;
      }
    } catch {
      // 忽略
    }

    await logLogin(username, request, true, '登录成功');

    // 生成 refresh token
    const refreshToken = crypto.randomUUID();
    const refreshExpiresAt = Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000;
    await storeRefreshToken(refreshToken, user.id, refreshExpiresAt);

    const response = NextResponse.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        refreshToken,
        user: userInfo,
      },
    });

    // 写入 httpOnly cookie：供 middleware 鉴权和 SSR 服务端预取菜单使用。
    // access_token 用于 SSR 预取 + middleware 拦截；refresh_token 用于服务端无感刷新。
    // 保留 JSON 返回的 token：客户端仍需要它做 Authorization header。
    response.cookies.set('access_token', token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE
        ? process.env.COOKIE_SECURE === 'true'
        : process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ACCESS_COOKIE_MAX_AGE,
    });
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE
        ? process.env.COOKIE_SECURE === 'true'
        : process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_TOKEN_TTL_SECONDS,
    });

    // 登录成功后下发 CSRF token cookie
    const csrfToken = generateCsrfToken();
    setCsrfCookie(response, csrfToken);

    return response;
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: '登录失败，请稍后重试',
      },
      { status: 500 }
    );
  }
}

async function logLogin(username: string, request: NextRequest, success: boolean, message: string) {
  try {
    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';
    await execute(
      `INSERT INTO sys_login_log (username, ip, user_agent, status, error_msg)
       VALUES (?, ?, ?, ?, ?)`,
      [username, ip, userAgent, success ? 1 : 0, success ? '' : message]
    );
  } catch {}
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
