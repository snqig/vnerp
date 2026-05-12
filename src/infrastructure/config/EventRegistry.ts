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
import { SalesShippedHandler } from '@/application/handlers/SalesShippedHandler';
import { SalesReceivableHandler } from '@/application/handlers/SalesReceivableHandler';

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

  eventBus.subscribe('sales.created', new AuditLogHandler());
  eventBus.subscribe('sales.submitted', new AuditLogHandler());
  eventBus.subscribe('sales.approved', new AuditLogHandler());
  eventBus.subscribe('sales.approved', new CacheInvalidationHandler());
  eventBus.subscribe('sales.shipped', new SalesShippedHandler());
  eventBus.subscribe('sales.shipped', new SalesReceivableHandler());
  eventBus.subscribe('sales.shipped', new AuditLogHandler());
  eventBus.subscribe('sales.shipped', new CacheInvalidationHandler());
  eventBus.subscribe('sales.closed', new AuditLogHandler());

  eventBus.subscribe('workorder.created', new AuditLogHandler());
  eventBus.subscribe('workorder.released', new AuditLogHandler());
  eventBus.subscribe('workorder.started', new AuditLogHandler());
  eventBus.subscribe('workorder.material_issued', new AuditLogHandler());
  eventBus.subscribe('workorder.completed', new AuditLogHandler());
  eventBus.subscribe('workorder.completed', new CacheInvalidationHandler());
  eventBus.subscribe('workorder.closed', new AuditLogHandler());

  return eventBus;
}
