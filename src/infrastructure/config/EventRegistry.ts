import { getEventBus, EventBus } from '@/infrastructure/event-bus/EventBus';
import { InventorySyncHandler } from '@/application/handlers/InventorySyncHandler';
import { InventoryRollbackHandler } from '@/application/handlers/InventoryRollbackHandler';
import { FinanceVoucherHandler } from '@/application/handlers/FinanceVoucherHandler';
import { QrCodeGenerationHandler } from '@/application/handlers/QrCodeGenerationHandler';
import { AuditLogHandler } from '@/application/handlers/AuditLogHandler';
import { CacheInvalidationHandler } from '@/application/handlers/CacheInvalidationHandler';
import { PurchaseApprovedHandler } from '@/application/handlers/PurchaseApprovedHandler';
import { PurchaseReceivedHandler } from '@/application/handlers/PurchaseReceivedHandler';
import { PurchasePayableHandler } from '@/application/handlers/PurchasePayableHandler';

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

  eventBus.subscribe('inbound.unapproved', new InventoryRollbackHandler());
  eventBus.subscribe('inbound.unapproved', new AuditLogHandler());
  eventBus.subscribe('inbound.unapproved', new CacheInvalidationHandler());

  eventBus.subscribe('inbound.cancelled', new AuditLogHandler());
  eventBus.subscribe('inbound.cancelled', new CacheInvalidationHandler());

  eventBus.subscribe('inbound.created', new AuditLogHandler());
  eventBus.subscribe('inbound.submitted', new AuditLogHandler());

  eventBus.subscribe('purchase.created', new AuditLogHandler());
  eventBus.subscribe('purchase.submitted', new AuditLogHandler());
  eventBus.subscribe('purchase.approved', new PurchaseApprovedHandler());
  eventBus.subscribe('purchase.approved', new AuditLogHandler());
  eventBus.subscribe('purchase.approved', new CacheInvalidationHandler());
  eventBus.subscribe('purchase.received', new PurchaseReceivedHandler());
  eventBus.subscribe('purchase.received', new PurchasePayableHandler());
  eventBus.subscribe('purchase.received', new AuditLogHandler());
  eventBus.subscribe('purchase.closed', new AuditLogHandler());

  return eventBus;
}
