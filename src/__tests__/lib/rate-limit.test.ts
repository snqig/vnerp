import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';

describe('Rate Limit 速率限制测试', () => {
  beforeEach(() => {
    resetRateLimit('test-user', 'test');
    resetRateLimit('test-user-2', 'test');
  });

  it('应允许在限制内的请求', () => {
    const result = checkRateLimit('test-user', {
      windowMs: 60000,
      maxRequests: 5,
      keyPrefix: 'test',
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('应在达到限制后拒绝请求', () => {
    const options = { windowMs: 60000, maxRequests: 3, keyPrefix: 'test' };
    checkRateLimit('test-user', options);
    checkRateLimit('test-user', options);
    checkRateLimit('test-user', options);

    const result = checkRateLimit('test-user', options);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('不同标识符应独立计数', () => {
    const options = { windowMs: 60000, maxRequests: 2, keyPrefix: 'test' };
    checkRateLimit('test-user', options);
    checkRateLimit('test-user', options);

    const result = checkRateLimit('test-user-2', options);
    expect(result.allowed).toBe(true);
  });

  it('被拒绝的请求应返回重试时间', () => {
    const options = { windowMs: 60000, maxRequests: 1, keyPrefix: 'test' };
    checkRateLimit('test-user', options);

    const result = checkRateLimit('test-user', options);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(60000);
  });

  it('重置后应重新允许请求', () => {
    const options = { windowMs: 60000, maxRequests: 1, keyPrefix: 'test' };
    checkRateLimit('test-user', options);

    let result = checkRateLimit('test-user', options);
    expect(result.allowed).toBe(false);

    resetRateLimit('test-user', 'test');

    result = checkRateLimit('test-user', options);
    expect(result.allowed).toBe(true);
  });
});
