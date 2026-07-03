import { getCacheManager, getRedisClientIfAvailable } from '@/infrastructure/cache/CacheManager';
import { RedisCacheManager } from '@/infrastructure/cache/RedisCacheManager';
import { getEventBusType } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { query } from '@/lib/db';
import { secureLog } from '@/lib/logger';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: { status: 'healthy' | 'unhealthy'; latencyMs?: number };
    redis?: {
      status: 'healthy' | 'unhealthy' | 'degraded';
      latencyMs?: number;
      mode: 'redis' | 'memory';
    };
    outbox?: {
      status: 'healthy' | 'unhealthy';
      pendingCount?: number;
      deadLetterCount?: number;
      eventBusType: 'memory' | 'db';
    };
    streamConsumer?: {
      status: 'healthy' | 'unhealthy' | 'inactive';
      running: boolean;
    };
  };
}

/**
 * 基础设施健康检查
 *
 * 检查项：
 * - database: SELECT 1 探活 + 延迟
 * - redis: PING 探活 + 延迟；内存模式标记 degraded
 * - outbox: 查询 pending/dead_letter 数量；memory 模式标记 inactive
 * - streamConsumer: 通过 AppInitializer 状态判断
 *
 * 状态聚合规则：
 * - 任一 unhealthy → unhealthy
 * - 无 unhealthy 但有 degraded → degraded
 * - 全部 healthy → healthy
 */
export class InfrastructureHealthCheck {
  static async check(): Promise<HealthStatus> {
    const checks: HealthStatus['checks'] = {} as HealthStatus['checks'];

    checks.database = await this.checkDatabase();
    checks.redis = await this.checkRedis();
    checks.outbox = await this.checkOutbox();
    checks.streamConsumer = this.checkStreamConsumer();

    const allChecks = Object.values(checks);
    const anyUnhealthy = allChecks.some((c) => c?.status === 'unhealthy');
    const anyDegraded = allChecks.some((c) => c?.status === 'degraded');

    return {
      status: anyUnhealthy ? 'unhealthy' : anyDegraded ? 'degraded' : 'healthy',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  private static async checkDatabase(): Promise<{
    status: 'healthy' | 'unhealthy';
    latencyMs?: number;
  }> {
    try {
      const start = Date.now();
      await query('SELECT 1');
      return { status: 'healthy', latencyMs: Date.now() - start };
    } catch (err) {
      secureLog('error', 'HealthCheck: database unhealthy', {
        error: err instanceof Error ? err.message : String(err),
      });
      return { status: 'unhealthy' };
    }
  }

  private static async checkRedis(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    latencyMs?: number;
    mode: 'redis' | 'memory';
  }> {
    const cache = getCacheManager();
    if (!(cache instanceof RedisCacheManager)) {
      return { status: 'degraded', mode: 'memory' };
    }

    try {
      const redis = getRedisClientIfAvailable();
      if (!redis) {
        return { status: 'degraded', mode: 'memory' };
      }
      const start = Date.now();
      await redis.ping();
      return { status: 'healthy', latencyMs: Date.now() - start, mode: 'redis' };
    } catch (err) {
      secureLog('error', 'HealthCheck: redis unhealthy', {
        error: err instanceof Error ? err.message : String(err),
      });
      return { status: 'unhealthy', mode: 'redis' };
    }
  }

  private static async checkOutbox(): Promise<{
    status: 'healthy' | 'unhealthy';
    pendingCount?: number;
    deadLetterCount?: number;
    eventBusType: 'memory' | 'db';
  }> {
    const eventBusType = getEventBusType();
    if (eventBusType === 'memory') {
      return { status: 'healthy', eventBusType: 'memory' };
    }

    try {
      const [pendingRows, deadLetterRows] = await Promise.all([
        query<{ count: number }>(
          `SELECT COUNT(*) as count FROM domain_event_outbox WHERE status IN ('pending', 'dispatching')`
        ),
        query<{ count: number }>(
          `SELECT COUNT(*) as count FROM domain_event_outbox WHERE status = 'dead_letter'`
        ),
      ]);

      const pendingCount = Number(pendingRows[0]?.count || 0);
      const deadLetterCount = Number(deadLetterRows[0]?.count || 0);

      const status = deadLetterCount > 0 ? 'unhealthy' : 'healthy';

      return {
        status,
        pendingCount,
        deadLetterCount,
        eventBusType: 'db',
      };
    } catch (err) {
      secureLog('error', 'HealthCheck: outbox check failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return { status: 'unhealthy', eventBusType: 'db' };
    }
  }

  private static checkStreamConsumer(): {
    status: 'healthy' | 'unhealthy' | 'inactive';
    running: boolean;
  } {
    try {
      const redis = getRedisClientIfAvailable();
      if (!redis) {
        return { status: 'inactive', running: false };
      }
      return { status: 'healthy', running: true };
    } catch {
      return { status: 'unhealthy', running: false };
    }
  }
}
