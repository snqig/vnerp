import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { PurchaseOrderApprovedEvent } from '@/domain/purchase/events/PurchaseOrderEvents';
import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';

export class PurchaseApprovedHandler implements EventHandler<PurchaseOrderApprovedEvent> {
  async handle(event: PurchaseOrderApprovedEvent): Promise<void> {
    const { orderId, orderNo, lines } = event.payload;

    secureLog('info', 'Purchase order approved, allowing inbound', {
      orderId,
      orderNo,
      lineCount: lines.length,
    });
  }
}
