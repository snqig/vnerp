import { DomainEventOutbox } from './DomainEventOutbox';
import { registerEventHandlers } from '@/infrastructure/config/EventRegistry';
import { secureLog } from '@/lib/logger';

const POLL_INTERVAL_MS = 5000;
const MAX_RETRY_COUNT = 3;
const BATCH_SIZE = 50;

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

      const pendingEvents = await DomainEventOutbox.fetchPendingEvents(BATCH_SIZE);

      for (const row of pendingEvents) {
        try {
          const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;

          await eventBus.publish({
            eventType: row.event_type,
            aggregateType: row.aggregate_type,
            aggregateId: row.aggregate_id,
            occurredAt: row.created_at,
            ...payload,
          });

          await DomainEventOutbox.markAsProcessed(row.id);
          processed++;
        } catch (error: unknown) {
          const retryCount = row.retry_count || 0;
          // 1.5 死信机制：retry_count 达到上限时标记为死信，不再消费
          // 完整错误栈：优先用 error.stack（含调用位置），降级到 error.message
          const { message: errorMessage, stack: errorStack } = extractErrorInfo(error);

          if (retryCount >= MAX_RETRY_COUNT) {
            // 标记死信：状态变 dead_letter，retry_count 不再递增，fetchPendingEvents 不再返回
            await DomainEventOutbox.markAsDeadLetter(row.id, errorStack);
            failed++;
            secureLog('error', 'Outbox event marked as dead letter', {
              eventId: row.id,
              eventType: row.event_type,
              retryCount,
              error: errorMessage,
            });
          } else {
            // 1.4 指数退避：失败后由 markAsFailed 设置 next_execute_at（1s/3s/9s）
            await DomainEventOutbox.markAsFailed(row.id, errorMessage);
            retried++;
            secureLog('warn', 'Outbox event failed, will retry', {
              eventId: row.id,
              eventType: row.event_type,
              retryCount: retryCount + 1,
              nextExecuteAt: `+${retryCount + 1 === 1 ? 1 : retryCount + 1 === 2 ? 3 : 9}s`,
              error: errorMessage,
            });
          }
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

    secureLog('info', 'Outbox poller starting', { intervalMs: POLL_INTERVAL_MS });

    pollTimer = setInterval(async () => {
      try {
        const result = await OutboxPoller.poll();
        if (result.processed > 0 || result.failed > 0) {
          secureLog('info', 'Outbox poll cycle', result);
        }
      } catch (error: unknown) {
        const { message } = extractErrorInfo(error);
        secureLog('error', 'Outbox poller interval error', { error: message });
      }
    }, POLL_INTERVAL_MS);

    if (pollTimer.unref) {
      pollTimer.unref();
    }
  }

  static stop(): void {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
      secureLog('info', 'Outbox poller stopped');
    }
  }

  static isRunning(): boolean {
    return pollTimer !== null;
  }
}
