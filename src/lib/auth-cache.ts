// 权限缓存模块 - 内存缓存实现
// 注意：生产环境建议使用Redis

interface CachedPermissions {
  permissions: string[];
  menus: any[];
  timestamp: number;
}

interface CachedUserInfo {
  userId: number;
  username: string;
  realName: string;
  roles: string[];
  timestamp: number;
}

// 缓存配置
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存
const MAX_CACHE_SIZE = 1000; // 最大缓存条目数

// 权限缓存存储
const permissionsCache = new Map<number, CachedPermissions>();
const userInfoCache = new Map<number, CachedUserInfo>();

// 清理过期缓存
function cleanExpiredCache() {
  const now = Date.now();

  for (const [userId, cached] of permissionsCache.entries()) {
    if (now - cached.timestamp > CACHE_TTL) {
      permissionsCache.delete(userId);
    }
  }

  for (const [userId, cached] of userInfoCache.entries()) {
    if (now - cached.timestamp > CACHE_TTL) {
      userInfoCache.delete(userId);
    }
  }
}

// 定期清理（每10分钟）
if (typeof window === 'undefined') {
  setInterval(cleanExpiredCache, 10 * 60 * 1000);
}

// 获取用户权限缓存
export function getCachedPermissions(userId: number): CachedPermissions | null {
  const cached = permissionsCache.get(userId);
  if (!cached) return null;

  // 检查是否过期
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    permissionsCache.delete(userId);
    return null;
  }

  return cached;
}

// 设置用户权限缓存
export function setCachedPermissions(
  userId: number,
  permissions: string[],
  menus: any[]
): void {
  // 限制缓存大小
  if (permissionsCache.size >= MAX_CACHE_SIZE) {
    const firstKey = permissionsCache.keys().next().value;
    if (firstKey !== undefined) {
      permissionsCache.delete(firstKey);
    }
  }

  permissionsCache.set(userId, {
    permissions,
    menus,
    timestamp: Date.now(),
  });
}

// 清除用户权限缓存
export function clearCachedPermissions(userId: number): void {
  permissionsCache.delete(userId);
}

// 清除所有权限缓存
export function clearAllPermissionsCache(): void {
  permissionsCache.clear();
}

// 获取用户信息缓存
export function getCachedUserInfo(userId: number): CachedUserInfo | null {
  const cached = userInfoCache.get(userId);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > CACHE_TTL) {
    userInfoCache.delete(userId);
    return null;
  }

  return cached;
}

// 设置用户信息缓存
export function setCachedUserInfo(
  userId: number,
  userInfo: Omit<CachedUserInfo, 'timestamp'>
): void {
  if (userInfoCache.size >= MAX_CACHE_SIZE) {
    const firstKey = userInfoCache.keys().next().value;
    if (firstKey !== undefined) {
      userInfoCache.delete(firstKey);
    }
  }

  userInfoCache.set(userId, {
    ...userInfo,
    timestamp: Date.now(),
  });
}

// 获取缓存统计信息（用于监控）
export function getCacheStats() {
  return {
    permissionsCacheSize: permissionsCache.size,
    userInfoCacheSize: userInfoCache.size,
    totalSize: permissionsCache.size + userInfoCache.size,
  };
}
