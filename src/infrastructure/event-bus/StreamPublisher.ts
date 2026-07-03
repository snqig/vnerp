import type { Redis } from 'ioredis';
import { secureLog } from '@/lib/logger';

const STREAM_KEY = 'erp:domain-events';

/**
 * Stream 最大长度（近似裁剪）
 *
 * XADD MAXLEN ~ 会近似裁剪到指定长度，避免 Stream 无限增长。
 * 警告：如果 StreamConsumer 停滞，旧消息可能被裁剪导致丢失。
 * 可通过 STREAM_MAX_LENGTH 环境变量配置，默认 10000。
 * 生产环境建议根据峰值流量和消费能力调整，确保消费端能跟上生产端。
 */
const MAX_STREAM_LENGTH = (() => {
  const raw = Number.parseInt(process.env.STREAM_MAX_LENGTH || '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 10000;
})();

/** Stream 长度告警阈值（MAX_STREAM_LENGTH 的 80%） */
const STREAM_LENGTH_WARN_THRESHOLD = Math.floor(MAX_STREAM_LENGTH * 0.8);
let streamLengthWarned = false;

export interface StreamPublishEvent {
  id: number;
  eventType: string;
  aggregateType?: string | null;
  aggregateId?: number | null;
  occurredAt: Date;
  payload: string;
}

/**
 * Redis Stream 事件发布器
 *
 * 将 OutboxPoller claim 的事件通过 XADD 投递到 Stream，
 * 供 StreamConsumer 以消费者组模式并行消费。
 *
 * - MAXLEN ~ 10000: 近似裁剪，避免 Stream 无限增长（~ 表示允许少量误差以提升性能）
 * - 字段均为字符串: Redis Stream field value 只接受 string
 * - XADD 成功即视为"已安全投递"，OutboxPoller 随后 markAsProcessed
 * - XADD 失败抛出异常，OutboxPoller 走重试/死信流程
 */
export class StreamPublisher {
  constructor(private readonly redis: Redis) {}

  async publish(event: StreamPublishEvent): Promise<string> {
    const occurredAtStr =
      event.occurredAt instanceof Date
        ? event.occurredAt.toISOString()
        : new Date(event.occurredAt).toISOString();

    try {
      const messageId = await this.redis.xadd(
        STREAM_KEY,
        'MAXLEN',
        '~',
        MAX_STREAM_LENGTH,
        '*',
        'eventId',
        String(event.id),
        'eventType',
        event.eventType,
        'aggregateType',
        event.aggregateType ?? '',
        'aggregateId',
        String(event.aggregateId ?? ''),
        'occurredAt',
        occurredAtStr,
        'payload',
        event.payload
      );

      if (!messageId) {
        throw new Error('XADD returned null messageId');
      }

      secureLog('debug', 'StreamPublisher: XADD success', {
        eventId: event.id,
        streamMessageId: messageId,
        eventType: event.eventType,
        stream: STREAM_KEY,
      });

      // 定期检查 Stream 长度，接近 MAXLEN 时告警（每达到 80% 阈值告警一次）
      // 避免每次 XADD 都查 XLEN，仅在首次达到阈值时告警
      if (!streamLengthWarned) {
        try {
          const streamLen = await this.redis.xlen(STREAM_KEY);
          if (streamLen >= STREAM_LENGTH_WARN_THRESHOLD) {
            streamLengthWarned = true;
            secureLog('warn', 'StreamPublisher: stream length approaching MAXLEN, old messages may be trimmed', {
              streamLength: streamLen,
              maxLength: MAX_STREAM_LENGTH,
              warnThreshold: STREAM_LENGTH_WARN_THRESHOLD,
              stream: STREAM_KEY,
              note: 'If StreamConsumer is stalled, increase STREAM_MAX_LENGTH or restart consumer',
            });
          }
        } catch {
          // XLEN 失败不影响主流程
        }
      }

      return messageId;
    } catch (error) {
      const e = error as Error;
      secureLog('error', 'StreamPublisher: XADD failed', {
        eventId: event.id,
        eventType: event.eventType,
        message: e.message,
      });
      throw error;
    }
  }
}
