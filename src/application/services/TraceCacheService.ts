import { getCacheManager } from '@/infrastructure/cache/CacheManager';
import { queryOne } from '@/lib/db';

const CACHE_PREFIX = 'trace:qr';
const CACHE_TTL = 300; // 5 分钟

export async function getCachedTrace(qrCode: string) {
  const cache = getCacheManager();
  const key = `${CACHE_PREFIX}:${qrCode}`;
  const cached = await cache.get<{
    record: Record<string, unknown>;
    timeline: Record<string, unknown>[];
    related_records: Record<string, unknown>[];
    batch: Record<string, unknown> | null;
    inventory: Record<string, unknown>[] | null;
    inbound: Record<string, unknown>[] | null;
    production_usage: Record<string, unknown>[] | null;
    product_qrs: Record<string, unknown>[] | null;
    shipment: Record<string, unknown>[] | null;
    order: Record<string, unknown> | null;
    quality: Record<string, unknown>[] | null;
  }>(key);

  if (cached) {
    return cached;
  }

  const record = await queryOne('SELECT * FROM qrcode_record WHERE qr_code = ? AND deleted = 0', [
    qrCode,
  ]);

  if (!record) {
    return null;
  }

  const result = {
    record,
    timeline: [],
    related_records: [],
    batch: null,
    inventory: null,
    inbound: null,
    production_usage: null,
    product_qrs: null,
    shipment: null,
    order: null,
    quality: null,
  };

  await cache.set(key, result, CACHE_TTL);
  return result;
}

export async function invalidateTraceCache(qrCode: string) {
  const cache = getCacheManager();
  const key = `${CACHE_PREFIX}:${qrCode}`;
  await cache.delete(key);
}

export async function invalidateTraceCacheByBatch(batchNo: string) {
  const cache = getCacheManager();
  await cache.deletePattern(`${CACHE_PREFIX}:*`);
}
