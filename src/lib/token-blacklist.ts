/**
 * Token 黑名单与撤销管理
 *
 * 设计：
 * - 单 token 撤销：登出时将 tokenKey 存入 CacheManager，TTL = token 剩余有效期
 * - 用户级撤销：修改密码/账号锁定时，记录"撤销时间戳"，所有 iat < ts 的 token 视为失效
 * - refresh token：登出时删除，验证时检查存在性
 *
 * 多实例支持：
 * - 配置 REDIS_URL → 使用 RedisCacheManager（多实例共享）
 * - 未配置 → InMemoryCacheManager（单实例降级，revokeAllUserTokens 仍可用但仅本进程生效）
 */

import { getCacheManager } from '@/infrastructure/cache/CacheManager';
import { secureLog } from '@/lib/logger';

// JWT 默认有效期：24h（与 login 路由 setExpirationTime('24h') 对齐）
const JWT_DEFAULT_TTL_SEC = 24 * 60 * 60;
// 用户级撤销标记的 TTL：覆盖最大 JWT 有效期，避免撤销标记过期后旧 token 复活
const USER_REVOKE_TTL_SEC = JWT_DEFAULT_TTL_SEC + 60;

/**
 * 将单个 token 加入黑名单
 * @param tokenKey - 调用方决定的 token 唯一标识（如 `token:${userId}:${token.slice(-20)}`）
 * @param expiresAtSec - token 的绝对过期时间戳（秒）。若传入毫秒会自动识别并转换。
 */
export async function revokeToken(tokenKey: string, expiresAtSec: number): Promise<void> {
  const cm = getCacheManager();
  // 兼容毫秒/秒：若数值远大于当前秒级时间戳，判定为毫秒
  const nowSec = Math.floor(Date.now() / 1000);
  let ttlSec: number;
  if (expiresAtSec > nowSec * 1000) {
    // 毫秒 → 转 TTL 秒
    ttlSec = Math.max(1, Math.floor(expiresAtSec / 1000) - nowSec);
  } else {
    ttlSec = Math.max(1, expiresAtSec - nowSec);
  }
  // 上限保护：避免误传超大值
  ttlSec = Math.min(ttlSec, JWT_DEFAULT_TTL_SEC);

  await cm.set(`revoked_token:${tokenKey}`, { revoked: true }, ttlSec);
  secureLog('info', 'revokeToken: token 已加入黑名单', { tokenKey, ttlSec });
}

/**
 * 检查单个 token 是否已被撤销
 */
export async function isTokenRevoked(tokenKey: string): Promise<boolean> {
  const cm = getCacheManager();
  const v = await cm.get<{ revoked: boolean }>(`revoked_token:${tokenKey}`);
  return v?.revoked === true;
}

/**
 * 撤销指定用户的所有 token（用于修改密码、账号锁定、强制下线等场景）
 *
 * 实现：记录"撤销时间戳"，所有签发时间早于该时间戳的 token 视为失效。
 * - Redis 模式：多实例共享，所有节点立即生效
 * - 内存模式：仅本进程生效，其他进程的旧 token 仍可用（已知限制）
 *
 * @param userId - 用户 ID
 * @param beforeTs - 可选，撤销该时间戳之前签发的 token（毫秒），默认当前时间
 */
export async function revokeAllUserTokens(userId: number, beforeTs?: number): Promise<void> {
  const cm = getCacheManager();
  const ts = beforeTs ?? Date.now();
  await cm.set(`revoked_user:${userId}`, { ts }, USER_REVOKE_TTL_SEC);
  secureLog('warn', 'revokeAllUserTokens: 已撤销用户所有 token', {
    userId,
    revokeBeforeTs: ts,
  });
}

/**
 * 检查用户是否被整体撤销（用于密码修改后让旧 token 失效）
 * @param userId - 用户 ID
 * @param tokenIat - 当前 token 的签发时间（毫秒），从 JWT payload.iat 获取（jose 已转为秒，调用方需 *1000）
 */
export async function isUserTokensRevoked(userId: number, tokenIatMs: number): Promise<boolean> {
  const cm = getCacheManager();
  const v = await cm.get<{ ts: number }>(`revoked_user:${userId}`);
  if (!v) return false;
  // 若 token 签发时间早于撤销时间戳，视为已撤销
  return tokenIatMs < v.ts;
}

// ============ Refresh Token 管理 ============

const REFRESH_TOKEN_PREFIX = 'refresh_token:';

/**
 * 存储 refresh token
 * @param token - refresh token 字符串
 * @param userId - 用户 ID
 * @param expiresAtMs - 过期时间戳（毫秒）
 */
export async function storeRefreshToken(
  token: string,
  userId: number,
  expiresAtMs: number
): Promise<void> {
  const cm = getCacheManager();
  const ttlSec = Math.max(1, Math.floor((expiresAtMs - Date.now()) / 1000));
  await cm.set(`${REFRESH_TOKEN_PREFIX}${token}`, { userId, expiresAtMs }, ttlSec);
}

/**
 * 验证 refresh token
 */
export async function verifyRefreshToken(token: string, userId: number): Promise<boolean> {
  const cm = getCacheManager();
  const v = await cm.get<{ userId: number; expiresAtMs: number }>(
    `${REFRESH_TOKEN_PREFIX}${token}`
  );
  if (!v) return false;
  if (v.userId !== userId) return false;
  if (v.expiresAtMs < Date.now()) {
    await cm.delete(`${REFRESH_TOKEN_PREFIX}${token}`);
    return false;
  }
  return true;
}

/**
 * 删除 refresh token（用于登出）
 */
export async function removeRefreshToken(token: string): Promise<void> {
  const cm = getCacheManager();
  await cm.delete(`${REFRESH_TOKEN_PREFIX}${token}`);
}
