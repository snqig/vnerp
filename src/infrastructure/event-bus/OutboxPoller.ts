import { DomainEventOutbox } from './DomainEventOutbox';
import { getEventBus } from './EventBus';
import { registerEventHandlers } from '@/infrastructure/config/EventRegistry';
import { secureLog } from '@/lib/logger';

const POLL_INTERVAL_MS = 5000;
const MAX_RETRY_COUNT = 3;
const BATCH_SIZE = 50;

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
      await DomainEventOutbox.markForRetry(0);

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
        } catch (error: any) {
          const retryCount = row.retry_count || 0;
          if (retryCount >= MAX_RETRY_COUNT) {
            await DomainEventOutbox.markAsFailed(row.id, error?.message || String(error));
            failed++;
            secureLog('error', 'Outbox event permanently failed', {
              eventId: row.id,
              eventType: row.event_type,
              retryCount,
              error: error?.message,
            });
          } else {
            await DomainEventOutbox.markAsFailed(row.id, error?.message || String(error));
            retried++;
            secureLog('warn', 'Outbox event failed, will retry', {
              eventId: row.id,
              eventType: row.event_type,
              retryCount: retryCount + 1,
              error: error?.message,
            });
          }
        }
      }
    } catch (error: any) {
      secureLog('error', 'Outbox poller error', { error: error?.message });
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
      } catch (error: any) {
        secureLog('error', 'Outbox poller interval error', { error: error?.message });
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
