import Redis from 'ioredis';
import type { CacheManager } from './CacheManager';
import { secureLog } from '@/lib/logger';

/**
 * 基于 Redis 的 CacheManager 实现
 * - 多实例共享缓存
 * - 支持 TTL 原子过期
 * - deletePattern 使用 SCAN 游标，避免 KEYS 阻塞
 */
export class RedisCacheManager implements CacheManager {
  private client: Redis;
  private connected = false;
  private lastErrorLogAt = 0;
  private errorSuppressedCount = 0;
  private static readonly ERROR_THROTTLE_MS = 30000;

  constructor(url: string, options?: { maxRetriesPerRequest?: number }) {
    this.client = new Redis(url, {
      // 降为 1：Redis 不可达时每条命令最多重试 1 次即 reject，
      // 配合 commandTimeout:1000 确保单命令最多阻塞 ~2s（而非 3 次 × 退避 = 6s+）
      maxRetriesPerRequest: options?.maxRetriesPerRequest ?? 1,
      enableReadyCheck: true,
      lazyConnect: false,
      // 单条命令最多等待 1s，避免 Redis 不可达时每条命令挂起数秒拖慢整体请求
      commandTimeout: 1000,
      // 重连退避：首次 200ms，后续最多 500ms，避免默认策略的 2s+ 间隔
      retryStrategy(times: number) {
        return Math.min(times * 200, 500);
      },
      reconnectOnError(err: Error) {
        // 仅对 READONLY 等可恢复错误自动重连
        const target = err as Error & { partial?: boolean };
        return target.partial === true;
      },
    });

    this.client.on('connect', () => {
      this.connected = true;
      this.lastErrorLogAt = 0;
      this.errorSuppressedCount = 0;
      secureLog('info', 'RedisCacheManager connected');
    });

    this.client.on('ready', () => {
      secureLog('info', 'RedisCacheManager ready');
    });

    this.client.on('error', (err: Error) => {
      this.connected = false;
      const now = Date.now();
      if (now - this.lastErrorLogAt < RedisCacheManager.ERROR_THROTTLE_MS) {
        this.errorSuppressedCount++;
        return;
      }
      const suppressed = this.errorSuppressedCount;
      this.lastErrorLogAt = now;
      this.errorSuppressedCount = 0;
      secureLog('warn', 'RedisCacheManager error (throttled 30s)', {
        message: err.message,
        suppressedCount: suppressed,
      });
    });

    this.client.on('end', () => {
      this.connected = false;
      secureLog('warn', 'RedisCacheManager connection closed');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    // 未连接时立即降级返回 null，避免 ioredis 重试阻塞请求（Redis 不可达时每条命令会挂起数秒）
    if (!this.connected) return null;
    try {
      const raw = await this.client.get(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      const e = err as Error;
      secureLog('error', 'RedisCacheManager.get failed', {
        key,
        message: e.message,
      });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    if (!this.connected) return;
    try {
      const raw = JSON.stringify(value);
      // EX 原子设置 TTL，避免 SET + EXPIRE 两次往返的竞态
      await this.client.set(key, raw, 'EX', ttlSeconds);
    } catch (err) {
      const e = err as Error;
      secureLog('error', 'RedisCacheManager.set failed', {
        key,
        ttlSeconds,
        message: e.message,
      });
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.del(key);
    } catch (err) {
      const e = err as Error;
      secureLog('error', 'RedisCacheManager.delete failed', {
        key,
        message: e.message,
      });
    }
  }

  /**
   * 模式删除：使用 SCAN 游标避免 KEYS 阻塞主库
   * pattern 为 Redis 风格（* 匹配），如 "revoked_jti:*"
   */
  async deletePattern(pattern: string): Promise<void> {
    if (!this.connected) return;
    try {
      let cursor = '0';
      const batch: string[] = [];
      do {
        // SCAN 返回 [nextCursor, keys[]]
        const reply = (await this.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          200
        )) as unknown as [string, string[]];
        cursor = reply[0];
        if (reply[1].length > 0) {
          batch.push(...reply[1]);
        }
        // 批量删除，避免单次 DEL 过多 key 阻塞
        if (batch.length >= 500) {
          await this.client.del(...batch.splice(0, 500));
        }
      } while (cursor !== '0');

      if (batch.length > 0) {
        await this.client.del(...batch);
      }
    } catch (err) {
      const e = err as Error;
      secureLog('error', 'RedisCacheManager.deletePattern failed', {
        pattern,
        message: e.message,
      });
    }
  }

  /**
   * 集合操作：用于 token-blacklist 的"撤销用户所有 token"
   * 将成员加入集合，并设置集合的 TTL（覆盖 maxJwtTtl）
   */
  async sAdd(key: string, ttlSeconds: number, ...members: string[]): Promise<void> {
    if (!this.connected) return;
    try {
      if (members.length === 0) return;
      const pipeline = this.client.multi();
      pipeline.sadd(key, ...members);
      pipeline.expire(key, ttlSeconds);
      await pipeline.exec();
    } catch (err) {
      const e = err as Error;
      secureLog('error', 'RedisCacheManager.sAdd failed', {
        key,
        memberCount: members.length,
        message: e.message,
      });
    }
  }

  /**
   * 判断成员是否在集合中
   */
  async sIsMember(key: string, member: string): Promise<boolean> {
    if (!this.connected) return false;
    try {
      const r = await this.client.sismember(key, member);
      return r === 1;
    } catch (err) {
      const e = err as Error;
      secureLog('error', 'RedisCacheManager.sIsMember failed', {
        key,
        message: e.message,
      });
      return false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * 关闭连接（用于测试或优雅退出）
   */
  async destroy(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      // ignore
    }
  }

  /**
   * 暴露原始客户端（仅用于特殊场景，如健康检查）
   */
  rawClient(): Redis {
    return this.client;
  }
}
