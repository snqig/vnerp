import { NextRequest } from 'next/server';
import { successResponse, withErrorHandler } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';
import { revokeToken, removeRefreshToken } from '@/lib/token-blacklist';

export const POST = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token) {
      // 将当前 token 加入黑名单（过期时间设为 24h 后，与 JWT 过期时间一致）
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      await revokeToken(`token:${userInfo.userId}:${token.slice(-20)}`, expiresAt);
    }

    // 删除 refresh token（如果请求体中提供）
    try {
      const body = await request.json();
      if (body.refreshToken) {
        await removeRefreshToken(body.refreshToken);
      }
    } catch {
      // 请求体可能为空，忽略
    }

    const response = successResponse(null, '登出成功');

    // 清除 httpOnly cookie：access_token + refresh_token
    // 通过 maxAge=0 立即过期，确保后续 SSR 和 middleware 不再识别为登录态
    response.cookies.set('access_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    response.cookies.set('refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  },
  { errorMessage: '登出失败' }
);
