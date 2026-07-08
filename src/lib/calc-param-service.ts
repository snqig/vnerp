/**
 * @module CalcParamService
 * @description 计算参数配置服务 — 统一管理 ERP 全模块硬编码计算参数。
 *   从 sys_calc_param 表读取参数值，内置 5 分钟内存缓存 + 兜底默认值机制。
 *   所有模块通过 getParam<T>(key, defaultValue) 获取参数，消除硬编码常量。
 *
 *   使用方式:
 *   ```ts
 *   const leadTime = await CalcParamService.getInt('mrp.default_lead_time_days', 7);
 *   const overheadRate = await CalcParamService.getDecimal('cost.overhead_rate', 0.15);
 *   ```
 */

import { query } from './db';

// ──────────────────────────────────────────────
// 类型定义
// ──────────────────────────────────────────────

interface CalcParamRow {
  id: number;
  category: string;
  param_key: string;
  param_value: string;
  value_type: 'int' | 'decimal' | 'boolean' | 'string';
  default_value: string | null;
  description: string | null;
  status: number;
}

interface CacheEntry {
  value: string;
  valueType: string;
  fetchedAt: number;
}

// ──────────────────────────────────────────────
// 常量
// ──────────────────────────────────────────────

/** 缓存 TTL: 5 分钟（毫秒） */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** 批量加载时一次拉取所有启用的参数 */
const LOAD_ALL_SQL = `SELECT param_key, param_value, value_type FROM sys_calc_param WHERE status = 1 AND deleted = 0`;

// ──────────────────────────────────────────────
// 服务实现
// ──────────────────────────────────────────────

class CalcParamServiceClass {
  private cache = new Map<string, CacheEntry>();
  private loadPromise: Promise<void> | null = null;
  private initialized = false;

  /**
   * 预加载所有参数到内存缓存。
   * 在应用启动时调用一次即可，后续自动按 TTL 刷新。
   */
  async preload(): Promise<void> {
    if (this.loadPromise) {
      await this.loadPromise;
      return;
    }
    this.loadPromise = this.loadAll();
    try {
      await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  /**
   * 从数据库加载全部参数到缓存。
   * 如果数据库不可用或表不存在，静默失败（兜底默认值生效）。
   */
  private async loadAll(): Promise<void> {
    try {
      const rows = await query<CalcParamRow>(LOAD_ALL_SQL);
      const now = Date.now();
      for (const row of rows) {
        this.cache.set(row.param_key, {
          value: row.param_value,
          valueType: row.value_type,
          fetchedAt: now,
        });
      }
      this.initialized = true;
    } catch {
      // 数据库不可用或表不存在时，静默失败，调用方使用兜底默认值
      this.initialized = true;
    }
  }

  /**
   * 确保缓存已初始化（懒加载）。
   * 首次调用时触发全量加载，后续调用直接返回。
   */
  private async ensureLoaded(): Promise<void> {
    if (this.initialized) {
      // 检查缓存是否过期，如果是则异步刷新（不阻塞当前请求）
      const oldest = this.getOldestCacheTime();
      if (oldest !== null && Date.now() - oldest > CACHE_TTL_MS) {
        // 异步刷新，不阻塞当前请求
        this.loadAll().catch(() => {});
      }
      return;
    }
    await this.preload();
  }

  /**
   * 获取缓存中最旧的条目时间戳。
   */
  private getOldestCacheTime(): number | null {
    if (this.cache.size === 0) return null;
    let oldest = Infinity;
    for (const entry of this.cache.values()) {
      if (entry.fetchedAt < oldest) oldest = entry.fetchedAt;
    }
    return oldest === Infinity ? null : oldest;
  }

  /**
   * 获取参数原始字符串值。
   * @param key - 参数键（如 'mrp.default_lead_time_days'）
   * @param defaultValue - 兜底默认值
   * @returns 参数值字符串，或兜底默认值
   */
  async getString(key: string, defaultValue: string): Promise<string> {
    await this.ensureLoaded();
    const entry = this.cache.get(key);
    if (entry) {
      return entry.value;
    }
    return defaultValue;
  }

  /**
   * 获取整数参数。
   * @param key - 参数键
   * @param defaultValue - 兜底默认值
   * @returns 整数值
   */
  async getInt(key: string, defaultValue: number): Promise<number> {
    const str = await this.getString(key, String(defaultValue));
    const parsed = parseInt(str, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * 获取浮点/小数参数。
   * @param key - 参数键
   * @param defaultValue - 兜底默认值
   * @returns 浮点数值
   */
  async getDecimal(key: string, defaultValue: number): Promise<number> {
    const str = await this.getString(key, String(defaultValue));
    const parsed = parseFloat(str);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * 获取布尔参数。
   * @param key - 参数键
   * @param defaultValue - 兜底默认值
   * @returns 布尔值
   */
  async getBoolean(key: string, defaultValue: boolean): Promise<boolean> {
    const str = await this.getString(key, String(defaultValue));
    return str === 'true' || str === '1';
  }

  // ─── 同步缓存读取（用于无法 await 的同步函数） ───

  /**
   * 同步获取整数参数（从缓存读取，不触发 DB 查询）。
   * 必须在 preload() 之后调用，否则返回 defaultValue。
   * @param key - 参数键
   * @param defaultValue - 兜底默认值
   * @returns 缓存中的整数值或 defaultValue
   */
  getCachedInt(key: string, defaultValue: number): number {
    const entry = this.cache.get(key);
    if (entry) {
      const parsed = parseInt(entry.value, 10);
      return isNaN(parsed) ? defaultValue : parsed;
    }
    return defaultValue;
  }

  /**
   * 同步获取浮点参数（从缓存读取，不触发 DB 查询）。
   * 必须在 preload() 之后调用，否则返回 defaultValue。
   * @param key - 参数键
   * @param defaultValue - 兜底默认值
   * @returns 缓存中的浮点值或 defaultValue
   */
  getCachedDecimal(key: string, defaultValue: number): number {
    const entry = this.cache.get(key);
    if (entry) {
      const parsed = parseFloat(entry.value);
      return isNaN(parsed) ? defaultValue : parsed;
    }
    return defaultValue;
  }

  /**
   * 强制刷新缓存（手动触发）。
   * 用于参数修改后立即生效的场景。
   */
  async refresh(): Promise<void> {
    await this.loadAll();
  }

  /**
   * 清空缓存（用于测试）。
   */
  clearCache(): void {
    this.cache.clear();
    this.initialized = false;
  }

  /**
   * 获取所有缓存的参数键列表（用于调试/监控）。
   */
  getCachedKeys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// 导出单例
export const CalcParamService = new CalcParamServiceClass();
