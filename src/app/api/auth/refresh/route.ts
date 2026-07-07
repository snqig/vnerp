import { NextRequest } from 'next/server';
import { SignJWT } from 'jose';
import { successResponse, errorResponse } from '@/lib/api-response';
import { verifyRefreshToken, storeRefreshToken, removeRefreshToken } from '@/lib/token-blacklist';
import { query } from '@/lib/db';
import { getRedisClientIfAvailable, getCacheManager } from '@/infrastructure/cache/CacheManager';

import { withPermission } from '@/lib/api-permissions';
const SECRET_KEY = process.env.JWT_SECRET || 'dev-only-secret-key';

const REFRESH_LOCK_TTL_SEC = 5;

async function acquireRefreshLock(refreshToken: string): Promise<boolean> {
  const lockKey = `refresh_lock:${refreshToken}`;
  const redis = getRedisClientIfAvailable();
  if (redis) {
    const result = await redis.set(lockKey, '1', 'EX', REFRESH_LOCK_TTL_SEC, 'NX');
    return result === 'OK';
  }
  const cm = getCacheManager();
  const existing = await cm.get(lockKey);
  if (existing !== null) return false;
  await cm.set(lockKey, '1', REFRESH_LOCK_TTL_SEC);
  return true;
}

async function releaseRefreshLock(refreshToken: string): Promise<void> {
  const lockKey = `refresh_lock:${refreshToken}`;
  const redis = getRedisClientIfAvailable();
  if (redis) {
    await redis.del(lockKey);
    return;
  }
  await getCacheManager().delete(lockKey);
}

interface RefreshUserRow {
  id: number;
  username: string;
  real_name: string;
  status: number;
}

interface RefreshRoleRow {
  role_code: string;
}

export const POST = withPermission(async (request: NextRequest) => {
  const body = await request.json();
  const { refreshToken, userId } = body;

  if (!refreshToken || !userId) {
    return errorResponse('缺少 refreshToken 或 userId', 400);
  }

  const locked = await acquireRefreshLock(refreshToken);
  if (!locked) {
    return errorResponse('正在刷新，请稍后重试', 429);
  }

  try {
    // 验证 refresh token
    if (!(await verifyRefreshToken(refreshToken, userId))) {
      return errorResponse('refresh token 无效或已过期', 401);
    }

    // 查询用户信息
    const users = await query<RefreshUserRow>(
      `SELECT id, username, real_name, status FROM sys_user WHERE id = ? AND deleted = 0 AND status = 1`,
      [userId]
    );

    if (!users || users.length === 0) {
      return errorResponse('用户不存在或已禁用', 401);
    }

    const user = users[0];

    // 查询用户角色
    const roles = await query<RefreshRoleRow>(
      `SELECT r.role_code FROM sys_role r
       JOIN sys_user_role ur ON r.id = ur.role_id
       WHERE ur.user_id = ? AND r.status = 1`,
      [userId]
    );

    // 生成新的 access token
    const newToken = await new SignJWT({
      userId: user.id,
      username: user.username,
      realName: user.real_name,
      roles: roles.map((r) => r.role_code),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(new TextEncoder().encode(SECRET_KEY));

    // 生成新的 refresh token
    const newRefreshToken = crypto.randomUUID();
    const refreshExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7天
    await storeRefreshToken(newRefreshToken, userId, refreshExpiresAt);

    // 删除旧的 refresh token
    await removeRefreshToken(refreshToken);

    return successResponse(
      {
        token: newToken,
        refreshToken: newRefreshToken,
      },
      'Token 刷新成功'
    );
  } finally {
    await releaseRefreshLock(refreshToken);
  }
});
