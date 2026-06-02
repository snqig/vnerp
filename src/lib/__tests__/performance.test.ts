import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

describe('Cache Strategy', () => {
  let cache: typeof import('@/lib/performance/cache-strategy').cacheStrategy;

  beforeEach(async () => {
    const { cacheStrategy } = await import('@/lib/performance/cache-strategy');
    cache = cacheStrategy;
    await cache.clear();
  });

  it('should set and get cached data', async () => {
    await cache.set('test-key', { data: 'test-value' });
    const result = await cache.get<{ data: string }>('test-key');
    expect(result).toEqual({ data: 'test-value' });
  });

  it('should return null for non-existent key', async () => {
    const result = await cache.get('non-existent');
    expect(result).toBeNull();
  });

  it('should delete cached data', async () => {
    await cache.set('test-key', 'value');
    await cache.delete('test-key');
    const result = await cache.get('test-key');
    expect(result).toBeNull();
  });

  it('should expire data after TTL', async () => {
    vi.useFakeTimers();
    
    await cache.set('test-key', 'value', { ttl: 1 });
    
    vi.advanceTimersByTime(1500);
    
    const result = await cache.get('test-key');
    expect(result).toBeNull();
    
    vi.useRealTimers();
  });

  it('should use getOrSet to fetch and cache', async () => {
    const fetcher = vi.fn().mockResolvedValue('fetched-value');
    
    const result1 = await cache.getOrSet('test-key', fetcher);
    expect(result1).toBe('fetched-value');
    expect(fetcher).toHaveBeenCalledTimes(1);
    
    const result2 = await cache.getOrSet('test-key', fetcher);
    expect(result2).toBe('fetched-value');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('Error Handling', () => {
  it('should create AppError with correct properties', async () => {
    const { AppError } = await import('@/lib/error-handling');
    
    const error = AppError.badRequest('Invalid input', { field: 'name' });
    
    expect(error.message).toBe('Invalid input');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.details).toEqual({ field: 'name' });
  });

  it('should handle different error types', async () => {
    const { AppError } = await import('@/lib/error-handling');
    
    expect(AppError.unauthorized().statusCode).toBe(401);
    expect(AppError.forbidden().statusCode).toBe(403);
    expect(AppError.notFound().statusCode).toBe(404);
    expect(AppError.internal().statusCode).toBe(500);
  });
});

describe('Circuit Breaker', () => {
  it('should execute function successfully', async () => {
    const { CircuitBreaker } = await import('@/lib/error-handling');
    
    const breaker = new CircuitBreaker(3, 1000);
    const fn = vi.fn().mockResolvedValue('success');
    
    const result = await breaker.execute(fn);
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should open circuit after threshold failures', async () => {
    const { CircuitBreaker } = await import('@/lib/error-handling');
    
    const breaker = new CircuitBreaker(2, 100);
    const fn = vi.fn().mockRejectedValue(new Error('failure'));
    
    await breaker.execute(fn).catch(() => {});
    await breaker.execute(fn).catch(() => {});
    
    const state = breaker.getState();
    expect(state.state).toBe('OPEN');
    
    await expect(breaker.execute(fn)).rejects.toThrow('服务熔断中');
  });
});

describe('Rate Limiter', () => {
  it('should allow requests within limit', async () => {
    const { createRateLimiter } = await import('@/lib/performance/api-optimization');
    
    const limiter = createRateLimiter({ windowMs: 60000, max: 5 });
    const req = new NextRequest('http://localhost/api/test');
    
    for (let i = 0; i < 5; i++) {
      const result = await limiter(req);
      expect(result?.success).toBe(true);
    }
  });

  it('should block requests over limit', async () => {
    const { createRateLimiter } = await import('@/lib/performance/api-optimization');
    
    const limiter = createRateLimiter({ windowMs: 60000, max: 2 });
    const req = new NextRequest('http://localhost/api/test');
    
    await limiter(req);
    await limiter(req);
    
    const result = await limiter(req);
    expect(result?.success).toBe(false);
    expect(result?.remaining).toBe(0);
  });
});

describe('Performance Monitor', () => {
  it('should record and retrieve metrics', async () => {
    const { performanceMonitor } = await import('@/lib/performance/frontend-optimization');
    
    await performanceMonitor.measure('test-operation', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    const stats = performanceMonitor.getStats('test-operation');
    
    expect(stats).not.toBeNull();
    expect(stats?.count).toBe(1);
    expect(stats?.avg).toBeGreaterThan(0);
  });
});

describe('Query Analyzer', () => {
  it('should log slow queries', async () => {
    const { queryAnalyzer } = await import('@/lib/performance/db-optimization');
    
    queryAnalyzer.logQuery('SELECT * FROM large_table', 1500);
    
    const slowQueries = queryAnalyzer.getSlowQueries();
    expect(slowQueries.length).toBeGreaterThan(0);
    expect(slowQueries[0].duration).toBe(1500);
  });

  it('should calculate statistics', async () => {
    const { queryAnalyzer } = await import('@/lib/performance/db-optimization');
    
    queryAnalyzer.logQuery('query1', 1200);
    queryAnalyzer.logQuery('query2', 1500);
    queryAnalyzer.logQuery('query3', 2000);
    
    const stats = queryAnalyzer.getSlowQueryStats();
    
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.averageDuration).toBeGreaterThan(0);
    expect(stats.maxDuration).toBeGreaterThanOrEqual(stats.averageDuration);
  });
});
