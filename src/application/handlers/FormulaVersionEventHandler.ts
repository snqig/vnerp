import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { FormulaVersionActivatedEvent } from '@/domain/dcprint/events/FormulaVersionEvents';
import { FormulaVersionCancelledEvent } from '@/domain/dcprint/events/FormulaVersionEvents';
import { secureLog } from '@/lib/logger';

export class FormulaVersionActivatedHandler implements EventHandler<FormulaVersionActivatedEvent> {
  async handle(event: FormulaVersionActivatedEvent): Promise<void> {
    const { versionId, colorId, versionNo, activatedBy, theoreticalCost } = event.payload;
    secureLog('info', 'Ink formula version activated', {
      versionId,
      colorId,
      versionNo,
      activatedBy,
      theoreticalCost,
    });
  }
}

export class FormulaVersionCancelledHandler implements EventHandler<FormulaVersionCancelledEvent> {
  async handle(event: FormulaVersionCancelledEvent): Promise<void> {
    const { versionId, colorId, versionNo, cancelledBy, reason } = event.payload;
    secureLog('info', 'Ink formula version cancelled', {
      versionId,
      colorId,
      versionNo,
      cancelledBy,
      reason,
    });
  }
}
