import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyGenerator?: (req: NextRequest) => string;
}

const rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();

export function createRateLimiter(config: RateLimitConfig) {
  return async (req: NextRequest): Promise<{ success: boolean; remaining: number; resetTime: number } | null> => {
    const key = config.keyGenerator?.(req) || getClientIp(req);
    const now = Date.now();
    
    let record = rateLimitStore.get(key);
    
    if (!record || record.resetTime < now) {
      record = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      rateLimitStore.set(key, record);
    }
    
    if (record.count >= config.max) {
      return {
        success: false,
        remaining: 0,
        resetTime: record.resetTime,
      };
    }
    
    record.count++;
    
    return {
      success: true,
      remaining: config.max - record.count,
      resetTime: record.resetTime,
    };
  };
}

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    return xff.split(',')[0].trim();
  }
  return 'unknown';
}

export const API_RATE_LIMITS = {
  AUTH: { windowMs: 15 * 60 * 1000, max: 5 },
  API_READ: { windowMs: 60 * 1000, max: 100 },
  API_WRITE: { windowMs: 60 * 1000, max: 30 },
  API_ADMIN: { windowMs: 60 * 1000, max: 50 },
  REPORT: { windowMs: 60 * 1000, max: 10 },
  EXPORT: { windowMs: 60 * 1000, max: 5 },
} as const;

export function withRateLimit(config: RateLimitConfig) {
  const limiter = createRateLimiter(config);
  
  return async (req: NextRequest) => {
    const result = await limiter(req);
    
    if (!result?.success) {
      return NextResponse.json(
        { success: false, message: '请求过于频繁，请稍后再试' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result?.resetTime.toString() || '',
          }
        }
      );
    }
    
    return null;
  };
}

interface CompressionConfig {
  threshold: number;
  level: number;
  types: string[];
}

export const COMPRESSION_CONFIG: CompressionConfig = {
  threshold: 1024,
  level: 6,
  types: [
    'application/json',
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/javascript',
  ],
};

export function shouldCompress(contentType: string, contentLength: number): boolean {
  return (
    contentLength >= COMPRESSION_CONFIG.threshold &&
    COMPRESSION_CONFIG.types.some(type => contentType.includes(type))
  );
}

interface RequestDeduplication {
  pending: Map<string, Promise<unknown>>;
  ttl: number;
}

const deduplicationStore: RequestDeduplication = {
  pending: new Map(),
  ttl: 100,
};

export async function deduplicateRequest<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const pending = deduplicationStore.pending.get(key);
  
  if (pending) {
    return pending as Promise<T>;
  }
  
  const promise = fetcher().finally(() => {
    setTimeout(() => {
      deduplicationStore.pending.delete(key);
    }, deduplicationStore.ttl);
  });
  
  deduplicationStore.pending.set(key, promise);
  
  return promise;
}

export function generateRequestKey(
  endpoint: string,
  params: Record<string, unknown>
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${JSON.stringify(params[key])}`)
    .join('&');
  
  return `${endpoint}?${sortedParams}`;
}

export const API_TIMEOUTS = {
  FAST: 5000,
  NORMAL: 15000,
  SLOW: 30000,
  UPLOAD: 60000,
  EXPORT: 120000,
} as const;

export function withTimeout<T>(
  promise: Promise<T>,
  timeout: number,
  message = '请求超时'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeout);
    }),
  ]);
}

export class ApiMetrics {
  private metrics: Map<string, {
    count: number;
    totalTime: number;
    errors: number;
    lastAccess: Date;
  }> = new Map();

  record(endpoint: string, duration: number, error: boolean): void {
    const existing = this.metrics.get(endpoint) || {
      count: 0,
      totalTime: 0,
      errors: 0,
      lastAccess: new Date(),
    };

    existing.count++;
    existing.totalTime += duration;
    if (error) existing.errors++;
    existing.lastAccess = new Date();

    this.metrics.set(endpoint, existing);
  }

  getMetrics(): Record<string, {
    count: number;
    avgTime: number;
    errorRate: number;
    lastAccess: Date;
  }> {
    const result: Record<string, {
      count: number;
      avgTime: number;
      errorRate: number;
      lastAccess: Date;
    }> = {};
    
    for (const [endpoint, data] of this.metrics.entries()) {
      result[endpoint] = {
        count: data.count,
        avgTime: data.totalTime / data.count,
        errorRate: data.errors / data.count,
        lastAccess: data.lastAccess,
      };
    }
    
    return result;
  }

  getSlowEndpoints(threshold = 1000): string[] {
    const slow: string[] = [];
    
    for (const [endpoint, data] of this.metrics.entries()) {
      if (data.totalTime / data.count > threshold) {
        slow.push(endpoint);
      }
    }
    
    return slow;
  }
}

export const apiMetrics = new ApiMetrics();
