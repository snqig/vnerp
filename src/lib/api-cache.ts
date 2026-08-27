import { getCacheManager } from '@/infrastructure/cache/CacheManager';
import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_TTL = 300;

export function cachedApiRoute(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: {
    ttl?: number;
    keyPrefix?: string;
    excludeParams?: string[];
  } = {}
): (request: NextRequest) => Promise<NextResponse> {
  const { ttl = DEFAULT_TTL, keyPrefix = 'api', excludeParams = [] } = options;

  return async (request: NextRequest): Promise<NextResponse> => {
    const cache = getCacheManager();
    const { searchParams, pathname } = new URL(request.url);

    const paramParts: string[] = [];
    searchParams.forEach((value, key) => {
      if (!excludeParams.includes(key)) {
        paramParts.push(`${key}=${value}`);
      }
    });
    paramParts.sort();

    const cacheKey = `${keyPrefix}:${pathname}:${paramParts.join('&')}`;

    const cached = await cache.get<string>(cacheKey);
    if (cached) {
      return new NextResponse(cached, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
        },
      });
    }

    const response = await handler(request);

    if (response.status === 200) {
      const body = await response.text();
      await cache.set(cacheKey, body, ttl);
      return new NextResponse(body, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'MISS',
        },
      });
    }

    return response;
  };
}

export async function invalidateCache(keyPrefix: string): Promise<void> {
  const cache = getCacheManager();
  await cache.deletePattern(keyPrefix);
}
