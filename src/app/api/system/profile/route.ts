import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { UserInfo } from '@/lib/api-auth';
import { withPermission } from '@/lib/api-permissions';
import { query, execute } from '@/lib/db';
import bcrypt from 'bcryptjs';

/**
 * 个人中心 API
 * GET - 获取个人信息
 * PUT - 更新个人信息 / 修改密码
 */

export const GET = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const rows: Loose = await query(
      `SELECT id, username, real_name, avatar, email, phone, department_id,
              last_login_time, last_login_ip, pwd_update_time
       FROM sys_user WHERE id = ? AND deleted = 0`,
      [userInfo.userId]
    );

    if (rows.length === 0) {
      return errorResponse('用户不存在', 404, 404);
    }

    const user = rows[0];
    return successResponse({
      id: user.id,
      username: user.username,
      realName: user.real_name,
      avatar: user.avatar,
      email: user.email,
      phone: user.phone,
      departmentId: user.department_id,
      lastLoginTime: user.last_login_time,
      lastLoginIp: user.last_login_ip,
      pwdUpdateTime: user.pwd_update_time,
    });
  },
  { errorMessage: '操作失败' }
);

export const PUT = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const body = await request.json();
    const { action } = body;

    // 修改密码
    if (action === 'password') {
      const { oldPassword, newPassword } = body;

      if (!oldPassword || !newPassword) {
        return errorResponse('请填写完整密码信息', 400, 400);
      }

      if (newPassword.length < 6) {
        return errorResponse('新密码长度不能少于6位', 400, 400);
      }

      const users: Loose = await query('SELECT password FROM sys_user WHERE id = ?', [
        userInfo.userId,
      ]);

      if (users.length === 0) {
        return errorResponse('用户不存在', 404, 404);
      }

      const isValid = await bcrypt.compare(oldPassword, users[0].password);
      if (!isValid) {
        return errorResponse('当前密码不正确', 400, 400);
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await execute(
        'UPDATE sys_user SET password = ?, pwd_update_time = NOW(), first_login = 0, update_time = NOW() WHERE id = ?',
        [hashedPassword, userInfo.userId]
      );

      return successResponse(null, '密码修改成功');
    }

    // 更新基本信息
    const { realName, phone, email } = body;
    const updates: string[] = [];
    const params: Loose[] = [];

    if (realName !== undefined) {
      updates.push('real_name = ?');
      params.push(realName);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }

    if (updates.length === 0) {
      return errorResponse('没有需要更新的字段', 400, 400);
    }

    updates.push('update_time = NOW()');
    params.push(userInfo.userId);

    await execute(`UPDATE sys_user SET ${updates.join(', ')} WHERE id = ?`, params);

    return successResponse(null, '个人信息更新成功');
  },
  { errorMessage: '操作失败' }
);
