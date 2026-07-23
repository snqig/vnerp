import { secureLog } from '@/lib/logger';
import type { DomainEvent } from '@/domain/shared/DomainEvent';

export class SagaCompensationHandler {
  async handle(event: DomainEvent): Promise<void> {
    secureLog('warn', `Compensation triggered for unrecoverable event`, {
      eventType: event.eventType,
      sagaId: event.payload?.sagaId,
    });
  }
}
