import { DomainEvent } from '../../domain/shared/DomainTypes';
import { secureLog } from '@/lib/logger';

export interface EventHandler<T extends DomainEvent = DomainEvent> {
  handle(event: T): Promise<void>;
}

export interface EventBus {
  publish<T extends DomainEvent>(event: T): Promise<void>;
  subscribe(eventType: string, handler: EventHandler): void;
}

export class InMemoryEventBus implements EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  /**
   * 发布事件：所有 handler 都会执行（allSettled 容错），但若有失败则最后抛出第一个错误
   * - 多 handler 容错：单个 handler 失败不会阻止其他 handler 执行
   * - 失败传播：调用方（如 OutboxPoller）可感知失败并触发重试/死信机制
   * - 错误聚合：记录所有失败 handler 的错误，抛出第一个错误（含 handler 索引）
   */
  async publish<T extends DomainEvent>(event: T): Promise<void> {
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
