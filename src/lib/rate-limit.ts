import type { NextRequest } from 'next/server';
import { getRedisClientIfAvailable } from '@/infrastructure/cache/CacheManager';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// 内存降级存储（REDIS_URL 缺失或 Redis 不可达时使用）
const memoryStore = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL = 60 * 1000;
const MAX_STORE_SIZE = 10000;

if (typeof window === 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      if (now > entry.resetTime) {
        memoryStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfterMs: number;
}

/**
 * 速率限制检查（生产环境强制 Redis，开发环境允许内存降级）
 *
 * Redis 模式使用 INCR + EXPIRE 实现固定窗口计数器，多实例共享。
 * 
 * 生产环境（NODE_ENV === 'production'）：
 * - 必须配置 REDIS_URL，Redis 不可用时抛出错误，禁止降级到内存
 * - 多实例部署时限流必须共享，否则被绕过
 * 
 * 开发环境：
 * - REDIS_URL 缺失或 Redis 操作异常时自动降级到内存 Map（仅单实例有效）
 */
export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const key = `${options.keyPrefix || 'rl'}:${identifier}`;
  const now = Date.now();
  const windowSeconds = Math.ceil(options.windowMs / 1000);
  const isProduction = process.env.NODE_ENV === 'production';

  const redis = getRedisClientIfAvailable();
  if (redis) {
    try {
      const redisKey = `rate:${key}`;
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.expire(redisKey, windowSeconds);
      }
      const ttl = await redis.ttl(redisKey);
      const resetTime = now + Math.max(ttl, 0) * 1000;

      if (count > options.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime,
          retryAfterMs: Math.max(resetTime - now, 0),
        };
      }

      return {
        allowed: true,
        remaining: options.maxRequests - count,
        resetTime,
        retryAfterMs: 0,
      };
    } catch (error) {
      if (isProduction) {
        throw new Error(`Rate limit Redis operation failed in production: ${(error as Error).message}`);
      }
    }
  }

  if (isProduction) {
    throw new Error('Rate limit requires Redis in production, but REDIS_URL is not configured or Redis is unavailable');
  }

  return checkRateLimitMemory(key, options, now);
}

function checkRateLimitMemory(
  key: string,
  options: RateLimitOptions,
  now: number
): RateLimitResult {
  let entry = memoryStore.get(key);

  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + options.windowMs,
    };
    memoryStore.set(key, entry);
  }

  if (memoryStore.size > MAX_STORE_SIZE) {
    const oldestKey = memoryStore.keys().next().value;
    if (oldestKey !== undefined) {
      memoryStore.delete(oldestKey);
    }
  }

  entry.count += 1;

  if (entry.count > options.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfterMs: entry.resetTime - now,
    };
  }

  return {
    allowed: true,
    remaining: options.maxRequests - entry.count,
    resetTime: entry.resetTime,
    retryAfterMs: 0,
  };
}

export async function resetRateLimit(identifier: string, keyPrefix?: string): Promise<void> {
  const key = `${keyPrefix || 'rl'}:${identifier}`;

  memoryStore.delete(key);

  const redis = getRedisClientIfAvailable();
  if (redis) {
    try {
      await redis.del(`rate:${key}`);
    } catch {
      // 降级：内存已清除，Redis 清除失败不影响功能
    }
  }
}

// 从请求头提取客户端 IP（供限流使用）
export function getClientIP(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const ips = xff.split(',').map((ip) => ip.trim());
    return ips[0] || '127.0.0.1';
  }
  return request.headers.get('x-real-ip') || '127.0.0.1';
}
