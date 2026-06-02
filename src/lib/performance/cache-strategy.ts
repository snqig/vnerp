interface CacheConfig {
  ttl: number;
  staleWhileRevalidate?: number;
  tags?: string[];
}

interface CacheEntry {
  data: unknown;
  expires: number;
  tags: string[];
}

const DEFAULT_TTL = 60 * 5;
const CACHE_PREFIX = 'erp:';

class CacheStrategy {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanup();
  }

  private startCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.memoryCache.entries()) {
        if (value.expires < now) {
          this.memoryCache.delete(key);
        }
      }
    }, 60000);
  }

  async get<T>(key: string): Promise<T | null> {
    const fullKey = CACHE_PREFIX + key;
    const cached = this.memoryCache.get(fullKey);
    
    if (cached && cached.expires > Date.now()) {
      return cached.data as T;
    }
    
    return null;
  }

  async set<T>(key: string, data: T, config: CacheConfig = { ttl: DEFAULT_TTL }): Promise<void> {
    const fullKey = CACHE_PREFIX + key;
    const expires = Date.now() + config.ttl * 1000;
    
    this.memoryCache.set(fullKey, {
      data: data as unknown,
      expires,
      tags: config.tags || [],
    });
  }

  async delete(key: string): Promise<void> {
    const fullKey = CACHE_PREFIX + key;
    this.memoryCache.delete(fullKey);
  }

  async deleteByTag(tag: string): Promise<void> {
    for (const [key, value] of this.memoryCache.entries()) {
      if (value.tags.includes(tag)) {
        this.memoryCache.delete(key);
      }
    }
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: CacheConfig = { ttl: DEFAULT_TTL }
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    await this.set(key, data, config);
    return data;
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.memoryCache.clear();
  }
}

export const cacheStrategy = new CacheStrategy();

export const CACHE_CONFIGS = {
  USER: { ttl: 60 * 30, tags: ['user'] },
  MENU: { ttl: 60 * 60, tags: ['menu'] },
  CUSTOMER: { ttl: 60 * 10, tags: ['customer'] },
  PRODUCT: { ttl: 60 * 15, tags: ['product'] },
  ORDER: { ttl: 60 * 5, tags: ['order'] },
  INVENTORY: { ttl: 60 * 2, tags: ['inventory'] },
  DASHBOARD: { ttl: 60 * 1, tags: ['dashboard'] },
  REPORT: { ttl: 60 * 30, tags: ['report'] },
} as const;

export function withCache<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  config: CacheConfig = { ttl: DEFAULT_TTL }
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args);
    return cacheStrategy.getOrSet(key, () => fn(...args) as Promise<unknown>, config);
  }) as T;
}
