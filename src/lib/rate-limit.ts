import type { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL = 60 * 1000;
const MAX_STORE_SIZE = 10000;

if (typeof window === 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetTime) {
        store.delete(key);
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

export function checkRateLimit(identifier: string, options: RateLimitOptions): RateLimitResult {
  const key = `${options.keyPrefix || 'rl'}:${identifier}`;
  const now = Date.now();

  let entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + options.windowMs,
    };
    store.set(key, entry);
  }

  if (store.size > MAX_STORE_SIZE) {
    const oldestKey = store.keys().next().value;
    if (oldestKey !== undefined) {
      store.delete(oldestKey);
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

export function resetRateLimit(identifier: string, keyPrefix?: string): void {
  const key = `${keyPrefix || 'rl'}:${identifier}`;
  store.delete(key);
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
