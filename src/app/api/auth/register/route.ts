import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody,
} from '@/lib/api-response';
import bcrypt from 'bcryptjs';

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
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body: RegisterData = await request.json();

  // 验证必填字段
  const validation = validateRequestBody(body, ['username', 'password']);

  if (!validation.valid) {
    return errorResponse(
      `缺少必填字段: ${validation.missing.join(', ')}`,
      400,
      400
    );
  }

  const { username, password, real_name, email, phone, department_id, role_id } = body;

  // 验证用户名格式
  if (!validateUsername(username)) {
    return errorResponse(
      '用户名只能包含字母、数字和下划线，长度4-20位',
      400,
      400
    );
  }

  // 验证密码强度
  if (!validatePassword(password)) {
    return errorResponse('密码长度不能少于6位', 400, 400);
  }

  // 验证邮箱格式
  if (email && !validateEmail(email)) {
    return errorResponse('邮箱格式不正确', 400, 400);
  }

  // 检查用户名是否已存在
  const existingUser = await queryOne<{ id: number }>(
    'SELECT id FROM sys_user WHERE username = ? AND deleted = 0',
    [username]
  );

  if (existingUser) {
    return errorResponse('用户名已存在', 409, 409);
  }

  // 检查邮箱是否已存在
  if (email) {
    const existingEmail = await queryOne<{ id: number }>(
      'SELECT id FROM sys_user WHERE email = ? AND deleted = 0',
      [email]
    );
    if (existingEmail) {
      return errorResponse('邮箱已被注册', 409, 409);
    }
  }

  // 检查手机号是否已存在
  if (phone) {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return errorResponse('手机号格式不正确', 400, 400);
    }
    const existingPhone = await queryOne<{ id: number }>(
      'SELECT id FROM sys_user WHERE phone = ? AND deleted = 0',
      [phone]
    );
    if (existingPhone) {
      return errorResponse('手机号已被注册', 409, 409);
    }
  }

  if (department_id) {
    const deptExists = await queryOne<{ id: number }>(
      'SELECT id FROM sys_department WHERE id = ? AND deleted = 0',
      [department_id]
    );
    if (!deptExists) {
      return errorResponse('指定的部门不存在', 400, 400);
    }
  }

  // 加密密码
  const hashedPassword = await hashPassword(password);

  // 使用事务创建用户和绑定角色
  const userId = await transaction<number>(async (connection) => {
    // 创建用户
    const [result]: any = await connection.execute(
      `INSERT INTO sys_user (username, password, real_name, email, phone, department_id, status, first_login, create_time)
       VALUES (?, ?, ?, ?, ?, ?, 1, 1, NOW())`,
      [username, hashedPassword, real_name || null, email || null, phone || null, department_id || null]
    );

    const newUserId = result.insertId;

    let roleBound = false;

    if (role_id) {
      const [roleResult]: any = await connection.execute(
        'SELECT id FROM sys_role WHERE id = ? AND deleted = 0',
        [role_id]
      );

      if (roleResult.length > 0) {
        await connection.execute(
          'INSERT INTO sys_user_role (user_id, role_id) VALUES (?, ?)',
          [newUserId, role_id]
        );
        roleBound = true;
      }
    } else {
      const [defaultRole]: any = await connection.execute(
        "SELECT id FROM sys_role WHERE role_code = 'operator' AND deleted = 0 LIMIT 1"
      );
      if (defaultRole.length > 0) {
        await connection.execute(
          'INSERT INTO sys_user_role (user_id, role_id) VALUES (?, ?)',
          [newUserId, defaultRole[0].id]
        );
        roleBound = true;
      }
    }

    if (!roleBound) {
      throw new Error('无法绑定角色，请确认系统已配置默认角色');
    }

    return newUserId;
  });

  return successResponse({ userId }, '注册成功');
}, '注册失败');
