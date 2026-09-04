import { getTranslations } from 'next-intl/server';

import { DomainEvent } from '../../domain/shared/DomainTypes';
import { secureLog } from '@/lib/logger';

export interface EventHandler<T extends DomainEvent = DomainEvent> {
  handle(event: T): Promise<void>;
}

export interface EventBus {
  publish<T extends DomainEvent>(event: T): Promise<void>;
  subscribe(eventType: string, handler: EventHandler): void;
}

/**
 * 需要 Saga 编排的事件类型。
 *
 * 背景（F-003 / 账实漂移根因）：
 *   默认的 publish 用 Promise.allSettled **并发**执行所有 handler，
 *   任一 handler 失败时，其余已成功提交的副作用**不会回滚** —— 跨模块即产生账实漂移。
 *   （典型：`workorder.completed` 并发派发给库存/成本/凭证/二维码等 7 个 handler）
 *
 * 对列入此表的事件，publish 改为：
 *   1. **串行**执行 handler（保证顺序可追踪，且避免并发写同一行库存）
 *   2. 记录已成功的 handler 列表
 *   3. 任一失败 → 对该事件发布补偿事件（携带已成功 handler 列表），再抛错
 *
 * 未列入的事件保持原并发语义，避免无谓放大延迟。
 */
const SAGA_ORCHESTRATED_EVENTS = new Set<string>([
  'workorder.completed', // 工单完工：库存批次 + 成本归集 + 凭证 + 二维码（7 个 handler）
  'prod.pick.approved', // 领料过账：库存 FIFO 扣减
  'prod.return.approved', // 退料过账：库存增加
  'inbound.approved', // 采购入库：库存同步 + 应付单 + 采购单回写 + 二维码（6 个 handler）
  'sales.shipped', // 销售发货：库存扣减 + 应收生成
  'delivery.shipped', // 发货单发货：库存扣减 + 订单明细回写 + 应收生成
]);

/** 判断某事件是否启用 Saga 编排 */
export function isSagaOrchestrated(eventType: string): boolean {
  return SAGA_ORCHESTRATED_EVENTS.has(eventType);
}

/** 运行时注册 Saga 编排事件（供未来扩展/测试注入） */
export function registerSagaOrchestratedEvent(eventType: string): void {
  SAGA_ORCHESTRATED_EVENTS.add(eventType);
}

export class InMemoryEventBus implements EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  /**
   * 发布事件：所有 handler 都会执行（allSettled 容错），但若有失败则最后抛出第一个错误
   * - 多 handler 容错：单个 handler 失败不会阻止其他 handler 执行
   * - 失败传播：调用方（如 OutboxPoller）可感知失败并触发重试/死信机制
   * - 错误聚合：记录所有失败 handler 的错误，抛出第一个错误（含 handler 索引）
   *
   * 若事件类型属于 SAGA_ORCHESTRATED_EVENTS，则改走 Saga 编排路径
   * （串行执行 + 失败自动补偿），详见 publishWithSaga。
   */
  async publish<T extends DomainEvent>(event: T): Promise<void> {
    if (isSagaOrchestrated(event.eventType)) {
      return this.publishWithSaga(event);
    }

    const handlers = this.handlers.get(event.eventType) || [];
    if (handlers.length === 0) {
      secureLog('debug', 'No handlers for event', { eventType: event.eventType });
      return;
    }

    const results = await Promise.allSettled(handlers.map((handler) => handler.handle(event)));

    const failures: { handlerIndex: number; reason: unknown }[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'rejected') {
        failures.push({ handlerIndex: i, reason: result.reason });
        secureLog('error', 'Event handler failed', {
          eventType: event.eventType,
          handlerIndex: i,
          error: String(result.reason),
        });
      }
    }

    // 1.5.1 若有 handler 失败，抛出第一个错误（保留 reason 的 stack/message）
    if (failures.length > 0) {
      const first = failures[0];
      const reason = first.reason;
      if (reason instanceof Error) {
        throw reason;
      }
      throw new Error(
        `Event handler [${event.eventType}#${first.handlerIndex}] failed: ${String(reason)}`
      );
    }
  }

  /**
   * Saga 编排式派发（F-003 核心）
   *
   * 串行执行 handler，记录已成功者；任一步失败即对该事件发布补偿事件，
   * 由 SagaCompensationHandler 撤销已提交的兄弟副作用，避免账实漂移。
   */
  private async publishWithSaga<T extends DomainEvent>(event: T): Promise<void> {
  const ts = await getTranslations('Common');
    const handlers = this.handlers.get(event.eventType) || [];
    if (handlers.length === 0) {
      secureLog('debug', 'No handlers for saga event', { eventType: event.eventType });
      return;
    }

    const completed: string[] = [];
    const sagaId = `saga:${event.eventType}:${Date.now()}:${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    for (let i = 0; i < handlers.length; i++) {
      const handler = handlers[i];
      const handlerName = handler.constructor?.name ?? `handler#${i}`;
      try {
        await handler.handle(event);
        completed.push(handlerName);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        secureLog('error', ts('k_1xm5eq1'), {
          sagaId,
          eventType: event.eventType,
          failedHandler: handlerName,
          completedHandlers: completed,
          error: message,
        });

        // 撤销已成功提交的兄弟副作用
        await this.triggerCompensation(event, sagaId, completed);

        throw error instanceof Error ? error : new Error(message);
      }
    }
  }

  /**
   * 发布补偿事件。补偿失败仅记录、不抛错 ——
   * 避免掩盖原始业务异常，也避免阻断调用方的重试/死信流程。
   */
  private async triggerCompensation<T extends DomainEvent>(
    event: T,
    sagaId: string,
    completedHandlers: string[]
  ): Promise<void> {
  const ts = await getTranslations('Common');
    if (completedHandlers.length === 0) return;

    const compensationEventType = `saga.compensate.${event.eventType}`;
    const compHandlers = this.handlers.get(compensationEventType) || [];
    if (compHandlers.length === 0) {
      secureLog('warn', ts('k_yctn3b'), {
        sagaId,
        compensationEventType,
        completedHandlers,
      });
      return;
    }

    try {
      await this.publish({
        eventType: compensationEventType,
        occurredAt: new Date(),
        payload: {
          sagaId,
          sagaType: event.eventType,
          originEventType: event.eventType,
          completedHandlers,
          ...((event.payload as Record<string, unknown>) ?? {}),
        },
      } as unknown as DomainEvent);
    } catch (compError) {
      secureLog('error', ts('k_1lgpppa'), {
        sagaId,
        compensationEventType,
        completedHandlers,
        error: compError instanceof Error ? compError.message : String(compError),
      });
    }
  }

  subscribe(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  getHandlerCount(eventType: string): number {
    return this.handlers.get(eventType)?.length || 0;
  }
}

let globalEventBus: InMemoryEventBus | null = null;

export function getEventBus(): InMemoryEventBus {
  if (!globalEventBus) {
    globalEventBus = new InMemoryEventBus();
  }
  return globalEventBus;
}
