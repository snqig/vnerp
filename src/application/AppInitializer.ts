import { EventRegistry } from './EventRegistry';
import { OutboxPoller } from '@/infrastructure/event-bus/OutboxPoller';
import { StreamConsumer } from '@/infrastructure/event-bus/StreamConsumer';
import { getEventBusType } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { getRedisClientIfAvailable } from '@/infrastructure/cache/CacheManager';
import { secureLog } from '@/lib/logger';

let initialized = false;
let outboxPollerStarted = false;
let streamConsumer: StreamConsumer | null = null;

export function initializeApplication(): void {
  if (initialized) {
    return;
  }

  try {
    EventRegistry.initialize();

    if (getEventBusType() === 'db') {
      // OutboxPoller: claim 事件 → XADD（Stream 模式）或直接 publish（内存模式）
      if (!outboxPollerStarted && !OutboxPoller.isRunning()) {
        OutboxPoller.start();
        outboxPollerStarted = true;
        secureLog('info', 'OutboxPoller auto-started (EVENT_BUS_TYPE=db)');
      }

      // StreamConsumer: Redis 可用时启动，XREADGROUP 消费 Stream 事件
      // 无 Redis 时 OutboxPoller 自动降级为直接 publish，无需 StreamConsumer
      const redisClient = getRedisClientIfAvailable();
      if (redisClient && !streamConsumer) {
        streamConsumer = new StreamConsumer(redisClient);
        streamConsumer
          .start()
          .catch((err) => {
            secureLog('error', 'StreamConsumer start failed', { error: String(err) });
            streamConsumer = null;
          });
        secureLog('info', 'StreamConsumer auto-started (Redis available)');
      } else if (!redisClient) {
        secureLog('info', 'StreamConsumer not started (Redis unavailable, OutboxPoller using direct publish)');
      }
    } else {
      secureLog('info', 'OutboxPoller not started (EVENT_BUS_TYPE=memory)');
    }

    initialized = true;
  } catch (error) {
    console.error('Failed to initialize application:', error);
  }
}

export function getInitializationStatus(): boolean {
  return initialized;
}

export function isOutboxPollerStarted(): boolean {
  return outboxPollerStarted;
}

export function isStreamConsumerStarted(): boolean {
  return streamConsumer !== null;
}
