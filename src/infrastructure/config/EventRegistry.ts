import { getEventBus, EventBus } from '@/infrastructure/event-bus/EventBus';
import { InventorySyncHandler } from '@/application/handlers/InventorySyncHandler';
import { FinanceVoucherHandler } from '@/application/handlers/FinanceVoucherHandler';
import { QrCodeGenerationHandler } from '@/application/handlers/QrCodeGenerationHandler';
import { AuditLogHandler } from '@/application/handlers/AuditLogHandler';
import { CacheInvalidationHandler } from '@/application/handlers/CacheInvalidationHandler';

let registered = false;

export function registerEventHandlers(): EventBus {
  const eventBus = getEventBus();

  if (registered) return eventBus;
  registered = true;

  eventBus.subscribe('inbound.approved', new InventorySyncHandler());
  eventBus.subscribe('inbound.approved', new FinanceVoucherHandler());
  eventBus.subscribe('inbound.approved', new QrCodeGenerationHandler());
  eventBus.subscribe('inbound.approved', new AuditLogHandler());
  eventBus.subscribe('inbound.approved', new CacheInvalidationHandler());

  eventBus.subscribe('inbound.cancelled', new AuditLogHandler());
  eventBus.subscribe('inbound.cancelled', new CacheInvalidationHandler());

  eventBus.subscribe('inbound.created', new AuditLogHandler());
  eventBus.subscribe('inbound.submitted', new AuditLogHandler());

  return eventBus;
}
