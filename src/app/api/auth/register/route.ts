import { getTranslations } from 'next-intl/server';

;
﻿import { NextRequest, NextResponse } from 'next/server';
import { queryOne, transaction } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  validateRequestBody,
  logOperation,
} from '@/lib/api-response';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';

import { withPermission } from '@/lib/api-permissions';

// 注册接口允许自助绑定的角色编码白名单（P1-9 安全修复）
// 仅开放前端一线非特权角色，禁止通过 role_id 自绑管理员/财务/业务等特权角色，防止越权提权。
// 特权角色的分配必须在 /api/system/user 中由具备 SYSTEM_USER 权限的管理员完成。
const ALLOWED_SELF_REGISTER_ROLES: string[] = [
  'operator', // 操作工
  'sales', // 业务员
  'clerk', // 文员
  'inspector', // 质检员
  'warehouse_keeper', // 仓管员
];

// 用户注册数据接口
interface RegisterData {
  username: string;
  password: string;
  real_name?: string;
  email?: string;
  phone?: string;
  department_id?: number;
  role_id?: number;
}

// 密码加密
async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

// 验证用户名格式
function validateUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{4,20}$/.test(username);
}

// 验证密码强度
function validatePassword(password: string): boolean {
  return password.length >= 6;
}

// 验证邮箱格式
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST - 用户注册
export const POST = withPermission(
  async (request: NextRequest) => {
  const tc = await getTranslations('Common');
  const ts = await getTranslations('Common');
    // 限流：每 IP 15 分钟最多 5 次注册，防批量注册
    const clientIP = getClientIP(request);
    const rateResult = await checkRateLimit(clientIP, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
      keyPrefix: 'register',
    });
    if (!rateResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `注册请求过于频繁，请${Math.ceil(rateResult.retryAfterMs / 60000)}分钟后再试`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(rateResult.retryAfterMs / 1000)) },
        }
      );
    }

    const body: RegisterData = await request.json();

    // 验证必填字段
    const validation = validateRequestBody(body, ['username', 'password']);

    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    const { username, password, real_name, email, phone, department_id, role_id } = body;

    // 验证用户名格式
    if (!validateUsername(username)) {
      return errorResponse(ts('k_15dtqad'), 400, 400);
    }

    // 验证密码强度
    if (!validatePassword(password)) {
      return errorResponse(tc('passwordTooShort'), 400, 400);
    }

    // 验证邮箱格式
    if (email && !validateEmail(email)) {
      return errorResponse(ts('k_1u3yg0h'), 400, 400);
    }

    // 检查用户名是否已存在
    const existingUser = await queryOne<{ id: number }>(
      'SELECT id FROM sys_user WHERE username = ? AND deleted = 0',
      [username]
    );

    if (existingUser) {
      return errorResponse(ts('k_1tff7b'), 409, 409);
    }

    // 检查邮箱是否已存在
    if (email) {
      const existingEmail = await queryOne<{ id: number }>(
        'SELECT id FROM sys_user WHERE email = ? AND deleted = 0',
        [email]
      );
      if (existingEmail) {
        return errorResponse(ts('k_qg0osj'), 409, 409);
      }
    }

    // 检查手机号是否已存在
    if (phone) {
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        return errorResponse(ts('k_ya5aay'), 400, 400);
      }
      const existingPhone = await queryOne<{ id: number }>(
        'SELECT id FROM sys_user WHERE phone = ? AND deleted = 0',
        [phone]
      );
      if (existingPhone) {
        return errorResponse(ts('k_1jgybse'), 409, 409);
      }
    }

    if (department_id) {
      const deptExists = await queryOne<{ id: number }>(
        'SELECT id FROM sys_department WHERE id = ? AND deleted = 0',
        [department_id]
      );
      if (!deptExists) {
        return errorResponse(ts('k_49h1e7'), 400, 400);
      }
    }

    // 安全：注册接口角色白名单校验，防止低权限用户通过 role_id 自绑管理员等特权角色（越权提权）
    // 仅允许自助绑定前端一线非特权角色；管理员/财务/业务等特权角色必须在 /api/system/user 中由管理员分配。
    let resolvedRoleId: number | null = null;
    if (role_id) {
      const roleRow = await queryOne<{ id: number; role_code: string }>(
        'SELECT id, role_code FROM sys_role WHERE id = ? AND deleted = 0',
        [role_id]
      );
      if (!roleRow) {
        return errorResponse(ts('k_8vvcb'), 400, 400);
      }
      if (!ALLOWED_SELF_REGISTER_ROLES.includes(roleRow.role_code)) {
        return errorResponse(ts('k_vfn6y6'), 403, 403);
      }
      resolvedRoleId = roleRow.id;
    }

    // 加密密码
    const hashedPassword = await hashPassword(password);

    // 使用事务创建用户和绑定角色
    const userId = await transaction<number>(async (connection) => {
      // 创建用户
      const [result] = await connection.execute(
        `INSERT INTO sys_user (username, password, real_name, email, phone, department_id, status, first_login, create_time)
       VALUES (?, ?, ?, ?, ?, ?, 1, 1, NOW())`,
        [
          username,
          hashedPassword,
          real_name || null,
          email || null,
          phone || null,
          department_id || null,
        ]
      );

      const newUserId = result.insertId;

      let roleBound = false;

      if (resolvedRoleId) {
        await connection.execute('INSERT INTO sys_user_role (user_id, role_id) VALUES (?, ?)', [
          newUserId,
          resolvedRoleId,
        ]);
        roleBound = true;
      } else {
        const [defaultRole] = await connection.execute(
          "SELECT id FROM sys_role WHERE role_code = 'operator' AND deleted = 0 LIMIT 1"
        );
        if (defaultRole.length > 0) {
          await connection.execute('INSERT INTO sys_user_role (user_id, role_id) VALUES (?, ?)', [
            newUserId,
            defaultRole[0].id,
          ]);
          roleBound = true;
        }
      }

      if (!roleBound) {
        throw new Error(ts('k_tmgvye'));
      }

      return newUserId;
    });

    await logOperation({
      title: ts('k_1q4vn5o'),
      oper_name: username,
      oper_type: 'auth',
      oper_method: 'POST',
      oper_url: '/api/auth/register',
      oper_param: JSON.stringify({
        username,
        real_name: real_name || '',
        email: email || '',
        phone: phone || '',
      }),
      oper_result: `用户 ${username} 注册成功`,
      status: 1,
    });

    return successResponse({ userId }, ts('k_1wcuqz8'));
  },
  { errorMessage: '注册失败' }
);
