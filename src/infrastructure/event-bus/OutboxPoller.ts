import { registerEventHandlers } from '@/application/EventRegistry';
import { getDomainEventOutbox } from './DomainEventOutboxFactory';
import { getRedisClientIfAvailable } from '@/infrastructure/cache/CacheManager';
import { StreamPublisher } from './StreamPublisher';
import { IdempotencyGuard } from './IdempotencyGuard';
import { secureLog } from '@/lib/logger';

const POLL_INTERVAL_MS = 5000;
const MAX_RETRY_COUNT = 3;
const BATCH_SIZE = 50;
const RECLAIM_INTERVAL_MS = 60000;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const CLEANUP_OLDER_THAN_DAYS = 30;

/**
 * dispatching 状态超时阈值（分钟）
 *
 * OutboxPoller 在 claimPendingEvents 后崩溃会导致事件卡在 'dispatching'。
 * 超过此阈值的事件会被 reclaimStaleDispatching 重置为 'pending'，使其可被重新消费。
 * 可通过 IDEMPOTENCY_DISPATCHING_TIMEOUT_MINUTES 环境变量配置，默认 10 分钟。
 */
const DISPATCHING_TIMEOUT_MINUTES = (() => {
  const raw = Number.parseInt(process.env.IDEMPOTENCY_DISPATCHING_TIMEOUT_MINUTES || '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 10;
})();

let cachedStreamPublisher: StreamPublisher | null | undefined;

function getStreamPublisher(): StreamPublisher | null {
  if (cachedStreamPublisher !== undefined) {
    return cachedStreamPublisher;
  }
  const redis = getRedisClientIfAvailable();
  cachedStreamPublisher = redis ? new StreamPublisher(redis) : null;
  if (cachedStreamPublisher) {
    secureLog('info', 'OutboxPoller: Stream mode enabled (Redis available)');
  }
  return cachedStreamPublisher;
}

export function __resetStreamPublisherForTest(): void {
  cachedStreamPublisher = undefined;
}

/**
 * 类型安全地从 unknown 错误中提取 message 和 stack
 * 替代 error: any 的不安全访问，避免 ESLint no-explicit-any 警告
 */
function extractErrorInfo(error: unknown): { message: string; stack: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack || error.message,
    };
  }
  const message = String(error);
  return { message, stack: message };
}

let polling = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let reclaimTimer: ReturnType<typeof setInterval> | null = null;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export class OutboxPoller {
  static async poll(): Promise<{ processed: number; failed: number; retried: number }> {
    if (polling) {
      return { processed: 0, failed: 0, retried: 0 };
    }

    polling = true;
    let processed = 0;
    let failed = 0;
    let retried = 0;

    try {
      // 1.4 移除 markForRetry(0) 批量重置：失败事件按 next_execute_at 自然到期重试
      // 由 markAsFailed 设置 next_execute_at 实现指数退避（1s/3s/9s）
      const eventBus = registerEventHandlers();
      const outbox = getDomainEventOutbox();
      const streamPublisher = getStreamPublisher();

      const pendingEvents = await outbox.claimPendingEvents(BATCH_SIZE);

      secureLog('debug', 'OutboxPoller: claimed pending events', {
        count: pendingEvents.length,
        eventIds: pendingEvents.map((e) => e.id),
        mode: streamPublisher ? 'stream' : 'memory',
      });

      for (const row of pendingEvents) {
        if (streamPublisher) {
          // Stream 模式：XADD 投递到 Redis Stream，消费端由 StreamConsumer 处理
          // XADD 成功即视为"已安全投递"，markAsProcessed 关闭 outbox 侧
          // 消费端失败由 Stream pending list + XAUTOCLAIM + IdempotentHandler 保证
          try {
            const streamMessageId = await streamPublisher.publish({
              id: row.id,
              eventType: row.eventType,
              aggregateType: row.aggregateType,
              aggregateId: row.aggregateId,
              occurredAt: row.createdAt,
              payload: typeof row.payload === 'string' ? row.payload : JSON.stringify(row.payload),
            });
            secureLog('debug', 'OutboxPoller: event XADD to stream', {
              eventId: row.id,
              streamMessageId,
              eventType: row.eventType,
            });
          } catch (publishError: unknown) {
            // XADD 失败：事件未入 Stream，走重试/死信流程
            const { message: errorMessage, stack: errorStack } = extractErrorInfo(publishError);
            const retryCount = row.retryCount || 0;
            if (retryCount >= MAX_RETRY_COUNT) {
              await outbox.markAsDeadLetter(row.id, errorStack);
              failed++;
              secureLog('error', 'Outbox event marked as dead letter (XADD failed)', {
                eventId: row.id,
                eventType: row.eventType,
                retryCount,
                error: errorMessage,
              });
            } else {
              await outbox.markAsFailed(row.id, errorMessage);
              retried++;
              secureLog('warn', 'Outbox event XADD failed, will retry', {
                eventId: row.id,
                eventType: row.eventType,
                retryCount: retryCount + 1,
                nextExecuteAt: `+${retryCount + 1 === 1 ? 1 : retryCount + 1 === 2 ? 3 : 9}s`,
                error: errorMessage,
              });
            }
            continue;
          }

          // XADD 成功，关闭 outbox 侧
          // markAsProcessed 失败不触发重试：事件已在 Stream 中，
          // 消费端由 IdempotentHandler 保证幂等，outbox 残留记录由 reclaimStaleDispatching 清理
          try {
            await outbox.markAsProcessed(row.id);
            secureLog('debug', 'OutboxPoller: event marked as processed', { eventId: row.id });
            processed++;
          } catch (markError: unknown) {
            const { message: markErrorMsg } = extractErrorInfo(markError);
            secureLog('warn', 'OutboxPoller: markAsProcessed failed after XADD success (event already in stream)', {
              eventId: row.id,
              error: markErrorMsg,
              note: 'Event remains in stream, consumer will process it; outbox record will be reclaimed by reclaimStaleDispatching',
            });
            processed++; // XADD 成功，outbox 侧仍计为 processed
          }
        } else {
          // 内存模式：直接 publish 到 InMemoryEventBus（开发降级，无 Redis 时使用）
          const payload =
            typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;

          try {
            await eventBus.publish({
              eventType: row.eventType,
              aggregateType: row.aggregateType ?? undefined,
              aggregateId: row.aggregateId ?? undefined,
              occurredAt: row.createdAt,
              ...payload,
              id: row.id,
            });
            secureLog('debug', 'OutboxPoller: event published (memory mode)', {
              eventId: row.id,
              eventType: row.eventType,
            });
          } catch (publishError: unknown) {
            // 内存模式 publish 失败：走重试/死信流程
            const { message: errorMessage, stack: errorStack } = extractErrorInfo(publishError);
            const retryCount = row.retryCount || 0;
            if (retryCount >= MAX_RETRY_COUNT) {
              await outbox.markAsDeadLetter(row.id, errorStack);
              failed++;
              secureLog('error', 'Outbox event marked as dead letter (publish failed)', {
                eventId: row.id,
                eventType: row.eventType,
                retryCount,
                error: errorMessage,
              });
            } else {
              await outbox.markAsFailed(row.id, errorMessage);
              retried++;
              secureLog('warn', 'Outbox event publish failed, will retry', {
                eventId: row.id,
                eventType: row.eventType,
                retryCount: retryCount + 1,
                nextExecuteAt: `+${retryCount + 1 === 1 ? 1 : retryCount + 1 === 2 ? 3 : 9}s`,
                error: errorMessage,
              });
            }
            continue;
          }

          try {
            await outbox.markAsProcessed(row.id);
            secureLog('debug', 'OutboxPoller: event marked as processed', { eventId: row.id });
          } catch (markError: unknown) {
            const { message: markErrorMsg } = extractErrorInfo(markError);
            secureLog('warn', 'OutboxPoller: markAsProcessed failed in memory mode', {
              eventId: row.id,
              error: markErrorMsg,
            });
          }
          processed++;
        }
      }
    } catch (error: unknown) {
      const { message } = extractErrorInfo(error);
      secureLog('error', 'Outbox poller error', { error: message });
    } finally {
      polling = false;
    }

    return { processed, failed, retried };
  }

  static start(): void {
    if (pollTimer) return;

    secureLog('info', 'Outbox poller starting', {
      intervalMs: POLL_INTERVAL_MS,
      reclaimIntervalMs: RECLAIM_INTERVAL_MS,
      cleanupIntervalMs: CLEANUP_INTERVAL_MS,
      dispatchingTimeoutMinutes: DISPATCHING_TIMEOUT_MINUTES,
    });

    pollTimer = setInterval(async () => {
      try {
        const result = await OutboxPoller.poll();
        if (result.processed > 0 || result.failed > 0 || result.retried > 0) {
          secureLog('info', 'Outbox poll cycle', {
            ...result,
            mode: getStreamPublisher() ? 'stream' : 'memory',
          });
        }
      } catch (error: unknown) {
        const { message } = extractErrorInfo(error);
        secureLog('error', 'Outbox poller interval error', { error: message });
      }
    }, POLL_INTERVAL_MS);

    // 定时回收崩溃残留记录（两类）
    // 1. sys_event_processed 中过期的 'processing' 记录（IdempotencyGuard 侧）
    // 2. domain_event_outbox 中卡在 'dispatching' 的事件（OutboxPoller 崩溃恢复）
    reclaimTimer = setInterval(async () => {
      try {
        await IdempotencyGuard.reclaimStaleProcessing();
      } catch (error: unknown) {
        const { message } = extractErrorInfo(error);
        secureLog('warn', 'OutboxPoller: reclaim stale processing error', { error: message });
      }
      try {
        const outbox = getDomainEventOutbox();
        await outbox.reclaimStaleDispatching(DISPATCHING_TIMEOUT_MINUTES);
      } catch (error: unknown) {
        const { message } = extractErrorInfo(error);
        secureLog('warn', 'OutboxPoller: reclaim stale dispatching error', { error: message });
      }
    }, RECLAIM_INTERVAL_MS);

    // 每天清理 30 天前的已处理记录（表膨胀控制）
    cleanupTimer = setInterval(async () => {
      try {
        await IdempotencyGuard.cleanupOlderThan(CLEANUP_OLDER_THAN_DAYS);
      } catch (error: unknown) {
        const { message } = extractErrorInfo(error);
        secureLog('warn', 'OutboxPoller: cleanup old records error', { error: message });
      }
    }, CLEANUP_INTERVAL_MS);

    if (pollTimer.unref) {
      pollTimer.unref();
    }
    if (reclaimTimer.unref) {
      reclaimTimer.unref();
    }
    if (cleanupTimer.unref) {
      cleanupTimer.unref();
    }
  }

  static stop(): void {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (reclaimTimer) {
      clearInterval(reclaimTimer);
      reclaimTimer = null;
    }
    if (cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
    if (pollTimer === null && reclaimTimer === null && cleanupTimer === null) {
      secureLog('info', 'Outbox poller stopped');
    }
  }

  static isRunning(): boolean {
    return pollTimer !== null;
  }
}
