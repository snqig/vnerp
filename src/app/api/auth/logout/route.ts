import { NextRequest, NextResponse } from 'next/server';
import { successResponse } from '@/lib/api-response';
import { extractToken, verifyToken, UserInfo } from '@/lib/auth';
import { revokeToken, removeRefreshToken } from '@/lib/token-blacklist';

/**
 * 清除 httpOnly cookie 的辅助函数。
 * 即使 token 验证失败，登出接口也必须清除 cookie，否则用户无法退出登录。
 */
function clearAuthCookies(response: NextResponse): void {
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
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 登出接口不要求有效 token：即使用户 token 已过期或无效，也必须能登出。
  // 这是修复"退不出登录"问题的关键设计：
  //   - 旧实现使用 withPermission 装饰，token 过期时返回 401，cookie 永远不会被清除
  //   - 现在：尽量撤销 token（加入黑名单），但无论如何都清除 cookie 并返回成功
  try {
    const token = extractToken(request);

    if (token) {
      // 尝试验证 token 并加入黑名单（验证失败也忽略，继续登出）
      const userInfo: UserInfo | null = await verifyToken(token);
      if (userInfo) {
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
        await revokeToken(`token:${userInfo.userId}:${token.slice(-20)}`, expiresAt);
      }
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
  } catch (error) {
    console.error('[Logout API] Error during token revocation:', error);
    // 不影响登出流程，继续清除 cookie
  }

  const response = successResponse(null, '登出成功');

  // 清除 httpOnly cookie：access_token + refresh_token
  // 通过 maxAge=0 立即过期，确保后续 SSR 和 middleware 不再识别为登录态
  clearAuthCookies(response);

  return response;
}
