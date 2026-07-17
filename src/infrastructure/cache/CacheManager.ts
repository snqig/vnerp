import { secureLog } from '@/lib/logger';
import { RedisCacheManager } from './RedisCacheManager';

export interface CacheManager {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  deletePattern(pattern: string): Promise<void>;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class InMemoryCacheManager implements CacheManager {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

let globalCache: CacheManager | null = null;

/**
 * 缓存管理器工厂：根据 REDIS_URL env 自动选择实现
 * - REDIS_URL 存在 → RedisCacheManager（多实例共享）
 * - 未配置或连接失败 → InMemoryCacheManager（单实例降级，仅开发环境友好）
 *
 * 注意：Redis 连接为异步过程，构造时若 Redis 不可达，RedisCacheManager 内部
 * 会记录 error 日志但不会抛出，调用方读到 null 时应感知是降级状态。
 */
export function getCacheManager(): CacheManager {
  if (!globalCache) {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        globalCache = new RedisCacheManager(redisUrl);
        secureLog('info', 'CacheManager: 使用 RedisCacheManager', { redisUrl });
      } catch (err) {
        const e = err as Error;
        secureLog('error', 'CacheManager: RedisCacheManager 初始化失败，降级到内存', {
          message: e.message,
          stack: e.stack,
        });
        globalCache = new InMemoryCacheManager();
      }
    } else {
      secureLog('info', 'CacheManager: 使用 InMemoryCacheManager（未配置 REDIS_URL）');
      globalCache = new InMemoryCacheManager();
    }
  }
  // 此时 globalCache 必已初始化（所有分支都赋值）
  return globalCache as CacheManager;
}

/**
 * 重置全局缓存管理器（仅用于测试）
 */
export function resetCacheManagerForTest(): void {
  globalCache = null;
}

/**
 * 获取 Redis 原始客户端（用于 Stream 等需要直接操作 Redis 的场景）
 * @returns Redis 客户端实例，未使用 Redis 时返回 null
 */
export function getRedisClientIfAvailable(): import('ioredis').default | null {
  if (globalCache && globalCache instanceof RedisCacheManager) {
    // Redis 未连接时返回 null，调用方（如 rate-limit）应降级到内存方案，
    // 避免对断开的客户端发命令导致每条命令挂起数秒
    if (!(globalCache as RedisCacheManager).isConnected()) {
      return null;
    }
    return (globalCache as RedisCacheManager).rawClient();
  }
  return null;
}
