import { EventRegistry } from './EventRegistry';
import { OutboxPoller } from '@/infrastructure/event-bus/OutboxPoller';
import { StreamConsumer } from '@/infrastructure/event-bus/StreamConsumer';
import { getEventBusType } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { getRedisClientIfAvailable } from '@/infrastructure/cache/CacheManager';
import { secureLog } from '@/lib/logger';

/**
 * 跨 bundle 单例状态。
 *
 * instrumentation.ts 的 register() 与 route handler 可能被 Next 编译进不同的
 * server chunk；那种情况下模块级变量会各自实例化，从而启动两个 OutboxPoller。
 * 统一挂到 globalThis 上，与 src/lib/db 的连接池同口径。
 */
interface AppInitState {
  done: boolean;
  pollerStarted: boolean;
  consumer: StreamConsumer | null;
}
const globalForAppInit = globalThis as unknown as { __appInitState?: AppInitState };
const appInitState: AppInitState =
  globalForAppInit.__appInitState ??
  (globalForAppInit.__appInitState = { done: false, pollerStarted: false, consumer: null });

export function initializeApplication(): void {
  if (appInitState.done) {
    return;
  }

  try {
    EventRegistry.initialize();

    if (getEventBusType() === 'db') {
      // OutboxPoller: claim 事件 → XADD（Stream 模式）或直接 publish（内存模式）
      if (!appInitState.pollerStarted && !OutboxPoller.isRunning()) {
        OutboxPoller.start();
        appInitState.pollerStarted = true;
        secureLog('info', 'OutboxPoller auto-started (EVENT_BUS_TYPE=db)');
      }

      // StreamConsumer: Redis 可用时启动，XREADGROUP 消费 Stream 事件
      // 无 Redis 时 OutboxPoller 自动降级为直接 publish，无需 StreamConsumer
      const redisClient = getRedisClientIfAvailable();
      if (redisClient && !appInitState.consumer) {
        appInitState.consumer = new StreamConsumer(redisClient);
        appInitState.consumer.start().catch((err) => {
          secureLog('error', 'StreamConsumer start failed', { error: String(err) });
          appInitState.consumer = null;
        });
        secureLog('info', 'StreamConsumer auto-started (Redis available)');
      } else if (!redisClient) {
        secureLog(
          'info',
          'StreamConsumer not started (Redis unavailable, OutboxPoller using direct publish)'
        );
      }
    } else {
      secureLog('info', 'OutboxPoller not started (EVENT_BUS_TYPE=memory)');
    }

    appInitState.done = true;
  } catch {}
}

export function getInitializationStatus(): boolean {
  return appInitState.done;
}

export function isOutboxPollerStarted(): boolean {
  return appInitState.pollerStarted;
}

export function isStreamConsumerStarted(): boolean {
  return appInitState.consumer !== null;
}
