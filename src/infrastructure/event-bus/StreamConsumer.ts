import type { Redis } from 'ioredis';
import { registerEventHandlers } from '@/application/EventRegistry';
import { secureLog } from '@/lib/logger';

const STREAM_KEY = 'erp:domain-events';
const GROUP = 'erp-consumers';
const CONSUMER_NAME = `consumer-${process.pid}`;
const BLOCK_MS = 5000;
const BATCH_SIZE = 50;
const RECLAIM_INTERVAL_MS = 60000;
const ERROR_BACKOFF_MS = 1000;

/**
 * 消息空闲超时阈值（毫秒）
 *
 * 超过此时间未被 ACK 的消息会被 XAUTOCLAIM 重新分配给当前消费者。
 * 此值必须大于 handler 的最大执行时间，否则正在执行的 handler 会被中断，
 * 导致消息被重复投递且可能因 IdempotentHandler 跳过执行而丢失。
 *
 * 可通过 STREAM_RECLAIM_IDLE_MS 环境变量配置，默认 60000（60 秒）。
 * 建议设置为 handler 最大执行时间的 1.5~2 倍。
 */
const RECLAIM_IDLE_MS = (() => {
  const raw = Number.parseInt(process.env.STREAM_RECLAIM_IDLE_MS || '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 60000;
})();

function fieldsToObject(fields: unknown[]): Record<string, string> {
  const obj: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    const key = String(fields[i]);
    const value = fields[i + 1];
    obj[key] = value === null || value === undefined ? '' : String(value);
  }
  return obj;
}

/**
 * Redis Stream 事件消费者
 *
 * 通过消费者组 (XREADGROUP) 从 Stream 拉取事件，分发到 InMemoryEventBus。
 *
 * 流程：
 * - OutboxPoller claim 事件 → XADD 到 Stream → markAsProcessed（outbox 侧完成）
 * - StreamConsumer XREADGROUP → eventBus.publish（含 IdempotentHandler 幂等保护）→ XACK
 *
 * 故障恢复：
 * - 消费失败不 ACK，消息保留在 pending list
 * - 定期 XAUTOCLAIM 回收 idle > 30s 的遗留消息（死消费者遗留）
 * - 幂等性由 IdempotentHandler 保证，重投递不会重复执行副作用
 *
 * 注意：不调用 outbox.markAsProcessed — OutboxPoller 在 XADD 成功后已标记。
 */
export class StreamConsumer {
  private running = false;
  private reclaimTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly redis: Redis) {}

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    await this.ensureGroup();
    secureLog('info', 'StreamConsumer started', { consumer: CONSUMER_NAME });

    this.startConsumeLoop();

    this.reclaimTimer = setInterval(() => {
      this.reclaimStaleMessages().catch((err) => {
        secureLog('warn', 'StreamConsumer: reclaim tick failed', { error: String(err) });
      });
    }, RECLAIM_INTERVAL_MS);
    if (this.reclaimTimer.unref) {
      this.reclaimTimer.unref();
    }
  }

  /**
   * 启动消费循环，异常退出时自动重启（带退避）
   *
   * consumeLoop 内部已有 try-catch 处理单次迭代错误，但如果循环本身
   * 意外退出（如 catch 块内部抛错），此处的包装会自动重启，
   * 避免 this.running=true 但实际不消费的静默死亡场景。
   */
  private startConsumeLoop(): void {
    this.consumeLoop().catch((err) => {
      secureLog('error', 'StreamConsumer: consumeLoop exited unexpectedly, will restart', {
        error: String(err),
        consumer: CONSUMER_NAME,
      });
      if (this.running) {
        setTimeout(() => {
          if (this.running) {
            secureLog('info', 'StreamConsumer: restarting consumeLoop', { consumer: CONSUMER_NAME });
            this.startConsumeLoop();
          }
        }, ERROR_BACKOFF_MS);
      }
    });
  }

  private async ensureGroup(): Promise<void> {
    try {
      await this.redis.xgroup('CREATE', STREAM_KEY, GROUP, '$', 'MKSTREAM');
      secureLog('info', 'StreamConsumer: consumer group created', { group: GROUP });
    } catch (err) {
      const e = err as Error;
      if (e.message?.includes('BUSYGROUP')) {
        secureLog('debug', 'StreamConsumer: consumer group already exists (BUSYGROUP)', {
          group: GROUP,
        });
        return;
      }
      throw err;
    }
  }

  private async consumeLoop(): Promise<void> {
    while (this.running) {
      try {
        const results = (await this.redis.xreadgroup(
          'GROUP',
          GROUP,
          CONSUMER_NAME,
          'COUNT',
          BATCH_SIZE,
          'BLOCK',
          BLOCK_MS,
          'STREAMS',
          STREAM_KEY,
          '>'
        )) as unknown;

        if (!results || !Array.isArray(results) || results.length === 0) {
          continue;
        }

        const eventBus = registerEventHandlers();

        for (const entry of results as [string, [string, unknown[]][]][]) {
          const messages = entry[1];
          secureLog('debug', 'StreamConsumer: batch received from XREADGROUP', {
            stream: entry[0],
            count: messages.length,
            messageIds: messages.map((m) => m[0]),
            consumer: CONSUMER_NAME,
          });
          for (const [messageId, fields] of messages) {
            await this.processMessage(messageId, fields, eventBus);
          }
        }
      } catch (error) {
        secureLog('error', 'StreamConsumer loop error', { error: String(error) });
        await new Promise((r) => setTimeout(r, ERROR_BACKOFF_MS));
      }
    }
  }

  private async processMessage(
    messageId: string,
    fields: unknown[],
    eventBus: ReturnType<typeof registerEventHandlers>
  ): Promise<void> {
    const data = fieldsToObject(fields);
    let eventId: number | undefined;

    try {
      eventId = Number(data.eventId);

      // eventId 损坏校验：NaN/0/非正数表示 Stream 消息格式异常
      // ACK 掉这条消息避免无限重投，同时记录 error 供排查
      if (!Number.isFinite(eventId) || eventId <= 0) {
        secureLog('error', 'StreamConsumer: invalid eventId in stream message, ACKing to skip', {
          messageId,
          rawEventId: data.eventId,
          eventType: data.eventType,
          consumer: CONSUMER_NAME,
        });
        await this.redis.xack(STREAM_KEY, GROUP, messageId);
        return;
      }

      // JSON.parse 畸形 payload 是不可恢复错误（非瞬时故障）
      // ACK 掉避免 XAUTOCLAIM 无限重投递，与 NaN eventId 处理方式一致
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(data.payload || '{}');
      } catch (parseError) {
        secureLog('error', 'StreamConsumer: invalid JSON payload, ACKing to skip', {
          messageId,
          eventId,
          eventType: data.eventType,
          rawPayload: data.payload?.substring(0, 200),
          error: parseError instanceof Error ? parseError.message : String(parseError),
          consumer: CONSUMER_NAME,
        });
        await this.redis.xack(STREAM_KEY, GROUP, messageId);
        return;
      }

      secureLog('debug', 'StreamConsumer: processing message', {
        messageId,
        eventId,
        eventType: data.eventType,
        consumer: CONSUMER_NAME,
      });

      await eventBus.publish({
        id: eventId,
        eventType: data.eventType,
        aggregateType: data.aggregateType || undefined,
        aggregateId: data.aggregateId ? Number(data.aggregateId) : undefined,
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
        payload,
      });

      secureLog('debug', 'StreamConsumer: event published to bus, now XACK', {
        messageId,
        eventId,
        eventType: data.eventType,
      });

      await this.redis.xack(STREAM_KEY, GROUP, messageId);

      secureLog('debug', 'StreamConsumer: message ACKed', {
        messageId,
        eventId,
        eventType: data.eventType,
      });
    } catch (error) {
      secureLog('error', 'StreamConsumer: process message failed, will retry via pending list', {
        messageId,
        eventId,
        eventType: data.eventType,
        consumer: CONSUMER_NAME,
        error: String(error),
        note: 'Message not ACKed — XAUTOCLAIM will redeliver after idle timeout',
      });
    }
  }

  /**
   * 回收死消费者遗留的未 ACK 消息
   * idle 超过 RECLAIM_IDLE_MS 的 pending 消息会被重新分配给当前消费者
   */
  private async reclaimStaleMessages(): Promise<void> {
    try {
      const result = (await this.redis.xautoclaim(
        STREAM_KEY,
        GROUP,
        CONSUMER_NAME,
        RECLAIM_IDLE_MS,
        '0',
        'COUNT',
        BATCH_SIZE
      )) as unknown;

      if (!Array.isArray(result) || result.length < 2) {
        secureLog('debug', 'StreamConsumer: reclaim returned no messages');
        return;
      }

      const messages = result[1] as [string, unknown[]][];
      if (!messages || messages.length === 0) {
        secureLog('debug', 'StreamConsumer: reclaim returned no messages');
        return;
      }

      secureLog('info', 'StreamConsumer: reclaimed stale messages from pending list', {
        count: messages.length,
        messageIds: messages.map((m) => m[0]),
        consumer: CONSUMER_NAME,
        idleThresholdMs: RECLAIM_IDLE_MS,
      });

      const eventBus = registerEventHandlers();
      for (const [messageId, fields] of messages) {
        const data = fieldsToObject(fields);
        secureLog('debug', 'StreamConsumer: reprocessing reclaimed message', {
          messageId,
          eventId: data.eventId,
          eventType: data.eventType,
        });
        await this.processMessage(messageId, fields, eventBus);
      }
    } catch (error) {
      secureLog('warn', 'StreamConsumer: reclaim error', { error: String(error) });
    }
  }

  stop(): void {
    this.running = false;
    if (this.reclaimTimer) {
      clearInterval(this.reclaimTimer);
      this.reclaimTimer = null;
    }
    secureLog('info', 'StreamConsumer stopped', { consumer: CONSUMER_NAME });
  }

  isRunning(): boolean {
    return this.running;
  }
}
