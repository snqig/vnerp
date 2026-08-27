import type { DomainEvent } from '@/domain/shared/DomainTypes';
import type { EventHandler } from './EventBus';
import { IdempotencyGuard } from './IdempotencyGuard';
import { secureLog } from '@/lib/logger';

/**
 * 幂等处理器装饰器（两阶段标记 + 崩溃恢复）
 *
 * 流程：
 * 1. checkAndMark → INSERT status='processing'（预占位，防止并发重复执行）
 * 2. 执行 inner.handle
 * 3a. 成功 → markAsProcessed（status='processing' → 'processed'，阻止未来重复）
 * 3b. 失败 → deleteMark（DELETE 记录，允许 XAUTOCLAIM/重试再次执行）
 *
 * 崩溃恢复：
 * - 进程在 step 1 与 step 2 之间崩溃 → 记录残留 'processing'
 * - 进程在 step 2 与 step 3a 之间崩溃 → 记录残留 'processing'
 * - reclaimStaleProcessing 定时清理 5 分钟前的 'processing' 记录
 * - 清理后 XAUTOCLAIM 重投递可再次执行
 *
 * 边界情况：
 * - 无 eventId（undefined/null）：非 outbox 来源事件，直接执行（不保护）
 * - eventId 损坏（NaN/0/非有限数）：记录 warn 日志后直接执行（不保护）
 *   防止 StreamConsumer 中 Number(data.eventId) 产生 NaN 时静默绕过幂等
 * - DB 故障：checkAndMark 降级返回 true（允许执行），markAsProcessed 失败仅 warn
 */
export class IdempotentHandler implements EventHandler {
  constructor(
    private readonly inner: EventHandler,
    private readonly handlerName: string = inner.constructor.name
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    const eventWithId = event as DomainEvent & { id?: number; eventId?: number };
    const rawEventId = eventWithId.id ?? eventWithId.eventId;

    // 无 eventId：非 outbox 来源事件（如内存总线直接发布），不保护
    if (rawEventId === undefined || rawEventId === null) {
      return this.inner.handle(event);
    }

    // eventId 损坏（NaN/0/非有限数）：记录 warn 但仍执行，避免阻塞队列
    if (!Number.isFinite(rawEventId) || rawEventId <= 0) {
      secureLog('warn', 'IdempotentHandler: invalid eventId, bypassing idempotency', {
        rawEventId,
        handlerName: this.handlerName,
        eventType: event.eventType,
      });
      return this.inner.handle(event);
    }

    const eventId = rawEventId;

    const shouldExecute = await IdempotencyGuard.checkAndMark(eventId, this.handlerName);
    if (!shouldExecute) {
      secureLog('debug', 'IdempotentHandler: skipping duplicate event', {
        eventId,
        handlerName: this.handlerName,
        eventType: event.eventType,
      });
      return;
    }

    try {
      await this.inner.handle(event);
      await IdempotencyGuard.markAsProcessed(eventId, this.handlerName);
      secureLog('debug', 'IdempotentHandler: handler succeeded, mark confirmed as processed', {
        eventId,
        handlerName: this.handlerName,
        eventType: event.eventType,
      });
    } catch (error) {
      // handler 失败：删除预占位，允许重试
      secureLog('warn', 'IdempotentHandler: handler failed, deleting mark for retry', {
        eventId,
        handlerName: this.handlerName,
        eventType: event.eventType,
        error: error instanceof Error ? error.message : String(error),
      });
      await IdempotencyGuard.deleteMark(eventId, this.handlerName);
      throw error;
    }
  }
}
