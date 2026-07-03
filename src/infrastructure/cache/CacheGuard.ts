import type { CacheManager } from './CacheManager';
import { RedisCacheManager } from './RedisCacheManager';
import { secureLog } from '@/lib/logger';

const LOCK_TTL_SECONDS = 3;
const LOCK_POLL_INTERVAL_MS = 50;
const CACHE_JITTER_SECONDS = 30;

interface RedisLockClient {
  set: (key: string, value: string, mode: string, ex: string, ttl: number) => Promise<string | null>;
  eval: (script: string, numkeys: number, ...keys: string[]) => Promise<unknown>;
}

const RELEASE_LOCK_SCRIPT =
  'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 缓存击穿/雪崩防护
 *
 * - singleflight：同进程内对同一 key 的并发回源只执行一次 loader
 * - SETNX 互斥锁：跨进程通过 Redis `SET key:lock token NX EX 3` 抢锁
 * - 防雪崩：写入时 TTL 加 0..30s 随机抖动，避免大批 key 同时过期
 * - 降级：Redis 不可用时退化为进程内 singleflight（仅保护单实例）
 */
export class CacheGuard {
  private redis: RedisLockClient | null = null;
  private localLoads = new Map<string, Promise<unknown>>();

  constructor(private cache: CacheManager) {
    if (cache instanceof RedisCacheManager) {
      this.redis = cache.rawClient() as unknown as RedisLockClient;
    }
  }

  async getOrLoad<T>(key: string, ttl: number, loader: () => Promise<T>): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached !== null) return cached;

    if (this.redis) {
      return this.getOrLoadWithRedisLock(key, ttl, loader);
    }
    return this.getOrLoadWithLocalSingleflight(key, ttl, loader);
  }

  private async getOrLoadWithRedisLock<T>(
    key: string,
    ttl: number,
    loader: () => Promise<T>
  ): Promise<T> {
    const lockKey = `${key}:lock`;
    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    for (let attempt = 0; attempt < 3; attempt++) {
      const acquired = await this.redis!.set(lockKey, token, 'NX', 'EX', LOCK_TTL_SECONDS);
      if (acquired === 'OK') {
        try {
          const value = await loader();
          const jitteredTtl = ttl + Math.floor(Math.random() * CACHE_JITTER_SECONDS);
          await this.cache.set(key, value, jitteredTtl);
          return value;
        } finally {
          await this.redis!.eval(RELEASE_LOCK_SCRIPT, 1, lockKey, token);
        }
      }

      // Lock not acquired — wait for holder to populate cache
      const waited = await this.waitForCache(key, LOCK_TTL_SECONDS * 1000 + 500);
      if (waited.hasValue) return waited.value as T;
      // Lock expired without cache being populated — retry to acquire
    }

    // All retries exhausted — fall back to direct load (best effort)
    secureLog('warn', 'CacheGuard: Redis lock retries exhausted, loading directly', { key });
    const value = await loader();
    await this.cache.set(key, value, ttl + Math.floor(Math.random() * CACHE_JITTER_SECONDS));
    return value;
  }

  private async getOrLoadWithLocalSingleflight<T>(
    key: string,
    ttl: number,
    loader: () => Promise<T>
  ): Promise<T> {
    const existing = this.localLoads.get(key);
    if (existing) {
      await existing.catch(() => undefined);
      const cached = await this.cache.get<T>(key);
      if (cached !== null) return cached;
    }

    const loadPromise = (async () => {
      const value = await loader();
      const jitteredTtl = ttl + Math.floor(Math.random() * CACHE_JITTER_SECONDS);
      await this.cache.set(key, value, jitteredTtl);
      return value;
    })();

    this.localLoads.set(key, loadPromise);
    try {
      return await loadPromise;
    } finally {
      this.localLoads.delete(key);
    }
  }

  private async waitForCache<T>(
    key: string,
    timeoutMs: number
  ): Promise<{ hasValue: boolean; value: T | null }> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await sleep(LOCK_POLL_INTERVAL_MS);
      const cached = await this.cache.get<T>(key);
      if (cached !== null) return { hasValue: true, value: cached };
    }
    return { hasValue: false, value: null };
  }
}
