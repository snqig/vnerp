import { EventRegistry } from './EventRegistry';
import { OutboxPoller } from '@/infrastructure/event-bus/OutboxPoller';
import { getEventBusType } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { secureLog } from '@/lib/logger';

let initialized = false;
let outboxPollerStarted = false;

export function initializeApplication(): void {
  if (initialized) {
    return;
  }

  try {
    EventRegistry.initialize();

    // 1.6 db 模式下自动启动 OutboxPoller，memory 模式不启动
    if (getEventBusType() === 'db' && !outboxPollerStarted && !OutboxPoller.isRunning()) {
      OutboxPoller.start();
      outboxPollerStarted = true;
      secureLog('info', 'OutboxPoller auto-started (EVENT_BUS_TYPE=db)');
    } else if (getEventBusType() === 'memory') {
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
