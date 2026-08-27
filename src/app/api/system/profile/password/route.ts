import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';
import { query, execute } from '@/lib/db';
import { revokeAllUserTokens } from '@/lib/token-blacklist';
import bcrypt from 'bcryptjs';

/**
 * 修改密码 API
 */

export const PUT = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const body = await request.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return errorResponse('请填写完整密码信息', 400, 400);
    }

    if (newPassword.length < 6) {
      return errorResponse('新密码长度不能少于6位', 400, 400);
    }

    // 检查密码复杂度
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (!hasLetter || !hasNumber) {
      return errorResponse('密码必须包含字母和数字', 400, 400);
    }

    const users = await query<{ password: string }>(
      'SELECT password FROM sys_user WHERE id = ? AND deleted = 0',
      [userInfo.userId]
    );

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

    // 修改密码后撤销该用户所有更早签发的 token（当前请求的 token 保留，可正常返回响应）
    // beforeTs = 当前 token iat + 1ms，确保当前 token 不被撤销，但其他设备的旧 token 立即失效
    const beforeTs = userInfo.iat ? userInfo.iat + 1 : Date.now();
    await revokeAllUserTokens(userInfo.userId, beforeTs);

    return successResponse(null, '密码修改成功，其他设备的登录状态已失效');
  },
  { errorMessage: '操作失败' }
);
