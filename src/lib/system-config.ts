import { query } from './db';

const CACHE_TTL = 60_000;

interface CacheEntry {
  value: string;
  expire: number;
}

const configCache = new Map<string, CacheEntry>();

/**
 * 读取系统配置（sys_config）的单个配置项。
 * 优先返回缓存值，未命中则从数据库读取并写入缓存。
 * 读取失败时返回 defaultValue，保证调用方逻辑不中断。
 */
export async function getSystemConfig(key: string, defaultValue = ''): Promise<string> {
  const now = Date.now();
  const cached = configCache.get(key);
  if (cached && cached.expire > now) {
    return cached.value;
  }

  try {
    const rows = await query(
      'SELECT config_value FROM sys_config WHERE config_key = ? AND deleted = 0 LIMIT 1',
      [key]
    );
    if (rows.length > 0) {
      const value = String(rows[0].config_value ?? '');
      configCache.set(key, { value, expire: now + CACHE_TTL });
      return value;
    }
  } catch {
    // 读取失败时忽略，回退默认值
  }

  return defaultValue;
}

/**
 * 批量读取系统配置项，返回 key -> value 的映射。
 */
export async function getSystemConfigs(keys: string[]): Promise<Record<string, string>> {
  const now = Date.now();
  const out: Record<string, string> = {};
  const missing: string[] = [];

  for (const key of keys) {
    const cached = configCache.get(key);
    if (cached && cached.expire > now) {
      out[key] = cached.value;
    } else {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    try {
      const placeholders = missing.map(() => '?').join(', ');
      const rows = await query(
        `SELECT config_key, config_value FROM sys_config WHERE config_key IN (${placeholders}) AND deleted = 0`,
        missing
      );
      const found: Record<string, string> = {};
      rows.forEach((row: any) => {
        found[row.config_key] = String(row.config_value ?? '');
      });
      for (const key of missing) {
        const value = found[key] ?? '';
        configCache.set(key, { value, expire: now + CACHE_TTL });
        out[key] = value;
      }
    } catch {
      // 读取失败时忽略，缺失项保持空字符串
    }
  }

  return out;
}

/**
 * 读取布尔型系统配置，'true' 返回 true，其余返回 false。
 */
export async function getSystemConfigBoolean(key: string, defaultFalse = false): Promise<boolean> {
  const value = await getSystemConfig(key, defaultFalse ? 'true' : 'false');
  return value === 'true';
}

/**
 * 读取数值型系统配置，解析失败返回 defaultValue。
 */
export async function getSystemConfigNumber(key: string, defaultValue = 0): Promise<number> {
  const value = await getSystemConfig(key, String(defaultValue));
  const num = Number(value);
  return Number.isFinite(num) ? num : defaultValue;
}

/**
 * 清除配置缓存（配置被修改后调用，确保后续读取最新值）。
 */
export function clearSystemConfigCache(): void {
  configCache.clear();
}
