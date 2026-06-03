import { NextRequest } from 'next/server';
import { successResponse, withErrorHandler } from '@/lib/api-response';
import { withAuthAndErrorHandler, UserInfo } from '@/lib/api-auth';
import { revokeToken, removeRefreshToken } from '@/lib/token-blacklist';

export const POST = withAuthAndErrorHandler(
  async (request: NextRequest, userInfo: UserInfo) => {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token) {
      // 将当前 token 加入黑名单（过期时间设为 24h 后，与 JWT 过期时间一致）
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      revokeToken(`token:${userInfo.userId}:${token.slice(-20)}`, expiresAt);
    }

    // 删除 refresh token（如果请求体中提供）
    try {
      const body = await request.json();
      if (body.refreshToken) {
        removeRefreshToken(body.refreshToken);
      }
    } catch {
      // 请求体可能为空，忽略
    }

    return successResponse(null, '登出成功');
  },
  { errorMessage: '登出失败' }
);
