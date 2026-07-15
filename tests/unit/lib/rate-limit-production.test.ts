import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/infrastructure/cache/CacheManager', () => ({
  getRedisClientIfAvailable: vi.fn(),
}));

const { getRedisClientIfAvailable } = await import('@/infrastructure/cache/CacheManager');
const { checkRateLimit } = await import('@/lib/rate-limit');

describe('rate-limit 生产环境强制 Redis', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.mocked(getRedisClientIfAvailable).mockReturnValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('生产环境 Redis 不可用时应抛出错误', async () => {
    vi.mocked(getRedisClientIfAvailable).mockReturnValue(null);
    
    await expect(
      checkRateLimit('test-ip', { windowMs: 60000, maxRequests: 10 })
    ).rejects.toThrow(
      'Rate limit requires Redis in production, but REDIS_URL is not configured or Redis is unavailable'
    );
  });

  it('生产环境 Redis 操作异常应抛出错误', async () => {
    const mockRedis = {
      incr: vi.fn().mockRejectedValue(new Error('Redis connection error')),
      expire: vi.fn(),
      ttl: vi.fn(),
    };
    vi.mocked(getRedisClientIfAvailable).mockReturnValue(mockRedis as never);
    
    await expect(
      checkRateLimit('test-ip', { windowMs: 60000, maxRequests: 10 })
    ).rejects.toThrow(
      'Rate limit Redis operation failed in production'
    );
  });
});

describe('rate-limit 开发环境降级', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.mocked(getRedisClientIfAvailable).mockReturnValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('开发环境 Redis 不可用时应降级到内存', async () => {
    vi.mocked(getRedisClientIfAvailable).mockReturnValue(null);
    
    const result = await checkRateLimit('test-ip', { windowMs: 60000, maxRequests: 10 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });
});