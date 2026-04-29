import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody,
} from '@/lib/api-response';
import bcrypt from 'bcryptjs';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { userId, oldPassword, newPassword } = body;

  const validation = validateRequestBody(body, ['userId', 'oldPassword', 'newPassword']);
  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  if (typeof userId !== 'number' && !/^\d+$/.test(String(userId))) {
    return errorResponse('userId 必须为数字', 400, 400);
  }

  if (newPassword.length < 6) {
    return errorResponse('新密码长度不能少于6位', 400, 400);
  }

  if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return errorResponse('新密码必须包含字母和数字', 400, 400);
  }

  const users: any = await query(
    'SELECT id, password, username FROM sys_user WHERE id = ? AND deleted = 0',
    [userId]
  );

  if (!users || users.length === 0) {
    return commonErrors.notFound('用户不存在');
  }

  const user = users[0];
  const isValid = await bcrypt.compare(oldPassword, user.password);
  if (!isValid) {
    return errorResponse('原密码错误', 400, 400);
  }

  const isSamePassword = await bcrypt.compare(newPassword, user.password);
  if (isSamePassword) {
    return errorResponse('新密码不能与旧密码相同', 400, 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await execute(
    'UPDATE sys_user SET password = ?, first_login = 0, pwd_update_time = NOW() WHERE id = ?',
    [hashedPassword, userId]
  );

  try {
    await execute(
      `INSERT INTO sys_operation_log (title, oper_name, oper_url, request_method, oper_ip, oper_time, status)
       VALUES (?, ?, ?, ?, ?, NOW(), ?)`,
      ['修改密码', user.username, '/api/auth/change-password', 'POST', '', 1]
    );
  } catch (e) {
    console.error('记录操作日志失败:', e);
  }

  return successResponse(null, '密码修改成功');
}, '修改密码失败');
