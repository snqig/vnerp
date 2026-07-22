import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { errorResponse, successResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';

export const POST = withPermission(
  async (request: NextRequest, userInfo) => {
    // 限流：每 IP 15 分钟最多 10 次密码修改，防暴力篡改
    const clientIP = getClientIP(request);
    const rateResult = await checkRateLimit(clientIP, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 10,
      keyPrefix: 'pwd-change',
    });
    if (!rateResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `操作过于频繁，请${Math.ceil(rateResult.retryAfterMs / 60000)}分钟后再试`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(rateResult.retryAfterMs / 1000)) },
        }
      );
    }

    const body = await request.json();
    const { oldPassword, newPassword, targetUserId } = body;

    if (!oldPassword || !newPassword) {
      return errorResponse('缺少必填字段: oldPassword, newPassword', 400, 400);
    }

    // 默认改自己的密码；仅 admin 可指定 targetUserId 改他人密码
    const isAdmin = userInfo.roles.includes('admin') || userInfo.roles.includes('super_admin');
    const effectiveUserId = isAdmin && targetUserId ? Number(targetUserId) : userInfo.userId;

    if (!Number.isFinite(effectiveUserId)) {
      return errorResponse('targetUserId 必须为数字', 400, 400);
    }

    // 从系统配置读取密码策略
    let minLength = 6;
    let requireSpecialChar = false;
    let requireUpperCase = false;
    let _passwordExpireDays = 0;
    try {
      const configs: Loose = await query(
        'SELECT config_key, config_value FROM sys_config WHERE config_key IN (?, ?, ?, ?)',
        [
          'system.password_min_length',
          'system.password_require_special',
          'system.password_require_uppercase',
          'system.password_expire_days',
        ]
      );
      for (const cfg of configs) {
        if (cfg.config_key === 'system.password_min_length')
          minLength = parseInt(cfg.config_value) || 6;
        if (cfg.config_key === 'system.password_require_special')
          requireSpecialChar = cfg.config_value === 'true';
        if (cfg.config_key === 'system.password_require_uppercase')
          requireUpperCase = cfg.config_value === 'true';
        if (cfg.config_key === 'system.password_expire_days')
          _passwordExpireDays = parseInt(cfg.config_value) || 0;
      }
    } catch {
      // 使用默认值
    }

    if (newPassword.length < minLength) {
      return errorResponse(`新密码长度不能少于${minLength}位`, 400, 400);
    }

    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return errorResponse('新密码必须包含字母和数字', 400, 400);
    }

    if (requireUpperCase && !/[A-Z]/.test(newPassword)) {
      return errorResponse('新密码必须包含大写字母', 400, 400);
    }

    if (requireSpecialChar && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      return errorResponse('新密码必须包含特殊字符', 400, 400);
    }

    const users: Loose = await query(
      'SELECT id, password, username FROM sys_user WHERE id = ? AND deleted = 0',
      [effectiveUserId]
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
      [hashedPassword, effectiveUserId]
    );

    try {
      await execute(
        `INSERT INTO sys_operation_log (title, oper_name, oper_url, request_method, oper_ip, oper_time, status)
         VALUES (?, ?, ?, ?, ?, NOW(), ?)`,
        ['修改密码', user.username, '/api/auth/change-password', 'POST', '', 1]
      );
    } catch {}

    return successResponse(null, '密码修改成功');
  },
  { logTitle: '修改密码', logType: 'auth' }
);
