import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { resetCacheManagerForTest, getCacheManager } = await import('@/infrastructure/cache/CacheManager');

describe('CacheManager 生产环境强制 Redis', () => {
  beforeEach(() => {
    resetCacheManagerForTest();
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    resetCacheManagerForTest();
    vi.unstubAllEnvs();
  });

  it('生产环境未配置 REDIS_URL 应抛出错误', () => {
    vi.stubEnv('REDIS_URL', '');
    
    expect(() => getCacheManager()).toThrow(
      'CacheManager: 生产环境必须配置 REDIS_URL'
    );
  });
});

describe('CacheManager 开发环境降级', () => {
  beforeEach(() => {
    resetCacheManagerForTest();
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    resetCacheManagerForTest();
    vi.unstubAllEnvs();
  });

  it('开发环境未配置 REDIS_URL 应降级到内存', () => {
    vi.stubEnv('REDIS_URL', '');
    
    const cm = getCacheManager();
    expect(cm).toBeDefined();
  });
});