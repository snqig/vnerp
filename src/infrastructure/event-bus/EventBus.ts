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

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    const handlers = this.handlers.get(event.eventType) || [];
    if (handlers.length === 0) {
      secureLog('debug', 'No handlers for event', { eventType: event.eventType });
      return;
    }

    const results = await Promise.allSettled(handlers.map((handler) => handler.handle(event)));

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'rejected') {
        secureLog('error', 'Event handler failed', {
          eventType: event.eventType,
          handlerIndex: i,
          error: String(result.reason),
        });
      }
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
