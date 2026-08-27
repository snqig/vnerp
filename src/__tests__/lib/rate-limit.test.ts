import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';

// mock Redis 客户端，强制走内存降级路径（测试环境无 Redis）
vi.mock('@/infrastructure/cache/CacheManager', () => ({
  getRedisClientIfAvailable: () => null,
}));

describe('Rate Limit 速率限制测试', () => {
  beforeEach(async () => {
    await resetRateLimit('test-user', 'test');
    await resetRateLimit('test-user-2', 'test');
  });

  it('应允许在限制内的请求', async () => {
    const result = await checkRateLimit('test-user', {
      windowMs: 60000,
      maxRequests: 5,
      keyPrefix: 'test',
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('应在达到限制后拒绝请求', async () => {
    const options = { windowMs: 60000, maxRequests: 3, keyPrefix: 'test' };
    await checkRateLimit('test-user', options);
    await checkRateLimit('test-user', options);
    await checkRateLimit('test-user', options);

    const result = await checkRateLimit('test-user', options);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('不同标识符应独立计数', async () => {
    const options = { windowMs: 60000, maxRequests: 2, keyPrefix: 'test' };
    await checkRateLimit('test-user', options);
    await checkRateLimit('test-user', options);

    const result = await checkRateLimit('test-user-2', options);
    expect(result.allowed).toBe(true);
  });

  it('被拒绝的请求应返回重试时间', async () => {
    const options = { windowMs: 60000, maxRequests: 1, keyPrefix: 'test' };
    await checkRateLimit('test-user', options);

    const result = await checkRateLimit('test-user', options);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(60000);
  });

  it('重置后应重新允许请求', async () => {
    const options = { windowMs: 60000, maxRequests: 1, keyPrefix: 'test' };
    await checkRateLimit('test-user', options);

    let result = await checkRateLimit('test-user', options);
    expect(result.allowed).toBe(false);

    await resetRateLimit('test-user', 'test');

    result = await checkRateLimit('test-user', options);
    expect(result.allowed).toBe(true);
  });
});
