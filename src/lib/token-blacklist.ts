/**
 * Token 黑名单管理
 * 用于登出时使 token 失效，以及 refresh token 管理
 */

// 内存黑名单（生产环境应使用 Redis）
const tokenBlacklist = new Map<string, number>();

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
}

/**
 * 将 token 加入黑名单
 * @param jti - JWT ID (唯一标识)
 * @param expiresAt - token 过期时间戳(ms)
 */
export function revokeToken(jti: string, expiresAt: number): void {
  cleanup();
  tokenBlacklist.set(jti, expiresAt);
}

/**
 * 检查 token 是否已被撤销
 * @param jti - JWT ID
 */
export function isTokenRevoked(jti: string): boolean {
  cleanup();
  return tokenBlacklist.has(jti);
}

/**
 * 撤销用户的所有 token（用于修改密码、账号锁定等场景）
 * 注意：内存实现无法撤销所有 token，需要配合 Redis 或数据库
 */
export function revokeAllUserTokens(_userId: number): void {
  // 内存实现无法高效撤销用户所有 token
  // 生产环境应使用 Redis: `SADD revoked_users:{userId} timestamp`
  console.warn('revokeAllUserTokens: 内存实现无法撤销用户所有 token，请使用 Redis');
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
