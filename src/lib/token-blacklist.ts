/**
 * Token 黑名单管理
 * 用于登出时使 token 失效，以及 refresh token 管理
 */

// 内存黑名单（生产环境应使用 Redis）
const tokenBlacklist = new Map<string, number>();

// 用户级 token 撤销记录（用于 revokeAllUserTokens）
const userTokenRevocations = new Map<number, number>();

// 清理过期条目（每小时执行一次）
const CLEANUP_INTERVAL = 60 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [token, expiry] of tokenBlacklist) {
    if (expiry < now) {
      tokenBlacklist.delete(token);
    }
  }

  // 清理过期的用户级撤销记录（保留7天）
  const USER_REVOKE_TTL = 7 * 24 * 60 * 60 * 1000;
  for (const [userId, revokedAt] of userTokenRevocations) {
    if (now - revokedAt > USER_REVOKE_TTL) {
      userTokenRevocations.delete(userId);
    }
  }
}

/**
 * 生成统一的 token key
 * @param userId - 用户ID
 * @param token - 原始 token
 */
function makeTokenKey(userId: number, token: string): string {
  return `token:${userId}:${token.slice(-20)}`;
}

/**
 * 将 token 加入黑名单
 * @param userId - 用户ID
 * @param token - 原始 token
 * @param expiresAt - token 过期时间戳(ms)
 */
export function revokeToken(userId: number, token: string, expiresAt: number): void {
  cleanup();
  const tokenKey = makeTokenKey(userId, token);
  tokenBlacklist.set(tokenKey, expiresAt);
}

/**
 * 检查 token 是否已被撤销
 * @param userId - 用户ID
 * @param token - 原始 token
 */
export function isTokenRevoked(userId: number, token: string): boolean {
  cleanup();
  const tokenKey = makeTokenKey(userId, token);
  if (tokenBlacklist.has(tokenKey)) {
    return true;
  }
  // 检查用户是否被全局撤销过
  const revokedAt = userTokenRevocations.get(userId);
  if (revokedAt) {
    return true;
  }
  return false;
}

/**
 * 撤销用户的所有 token（用于修改密码、账号锁定等场景）
 * 内存实现：记录用户撤销时间戳，后续该用户所有 token 均视为无效
 */
export function revokeAllUserTokens(userId: number): void {
  cleanup();
  userTokenRevocations.set(userId, Date.now());
  console.warn('revokeAllUserTokens: 使用内存实现，建议生产环境使用 Redis');
}

// Refresh Token 存储（生产环境应使用 Redis 或数据库）
const refreshTokens = new Map<string, { userId: number; expiresAt: number }>();

/**
 * 存储 refresh token
 */
export function storeRefreshToken(token: string, userId: number, expiresAt: number): void {
  refreshTokens.set(token, { userId, expiresAt });
}

/**
 * 验证 refresh token
 */
export function verifyRefreshToken(token: string, userId: number): boolean {
  const stored = refreshTokens.get(token);
  if (!stored) return false;
  if (stored.userId !== userId) return false;
  if (stored.expiresAt < Date.now()) {
    refreshTokens.delete(token);
    return false;
  }
  return true;
}

/**
 * 删除 refresh token（用于登出）
 */
export function removeRefreshToken(token: string): void {
  refreshTokens.delete(token);
}
