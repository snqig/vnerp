import { getEventBus } from '@/infrastructure/event-bus/EventBus';
import { SalesOrderApprovedEvent } from '@/domain/sales/events/SalesOrderEvents';
import { SalesOrderShippedEvent } from '@/domain/sales/events/SalesOrderEvents';
import { SalesOrderCreatedEvent } from '@/domain/sales/events/SalesOrderEvents';
import { WorkOrderCompletedEvent } from '@/domain/production/events/WorkOrderEvents';
import { WorkOrderMaterialIssuedEvent } from '@/domain/production/events/WorkOrderEvents';
import { InboundOrderApprovedEvent } from '@/domain/warehouse/events/InboundOrderEvents';

import { SalesToWorkOrderHandler } from '@/application/handlers/SalesToWorkOrderHandler';
import { SalesShippedHandler } from '@/application/handlers/SalesShippedHandler';
import { InventorySyncHandler } from '@/application/handlers/InventorySyncHandler';
import { FinanceVoucherHandler } from '@/application/handlers/FinanceVoucherHandler';
import { QrCodeGenerationHandler } from '@/application/handlers/QrCodeGenerationHandler';
import { AuditLogHandler } from '@/application/handlers/AuditLogHandler';
import { CacheInvalidationHandler } from '@/application/handlers/CacheInvalidationHandler';
import { InkCostHandler } from '@/application/handlers/InkCostHandler';
import { ScreenPlateCostHandler } from '@/application/handlers/ScreenPlateCostHandler';
import { secureLog } from '@/lib/logger';

export class EventRegistry {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) {
      secureLog('debug', 'Event registry already initialized');
      return;
    }

    const eventBus = getEventBus();

    // 销售订单事件处理器
    eventBus.subscribe('sales.approved', new SalesToWorkOrderHandler());
    eventBus.subscribe('sales.approved', new AuditLogHandler());
    eventBus.subscribe('sales.approved', new CacheInvalidationHandler());

    eventBus.subscribe('sales.shipped', new SalesShippedHandler());
    eventBus.subscribe('sales.shipped', new FinanceVoucherHandler());
    eventBus.subscribe('sales.shipped', new AuditLogHandler());
    eventBus.subscribe('sales.shipped', new CacheInvalidationHandler());

    eventBus.subscribe('sales.created', new AuditLogHandler());
    eventBus.subscribe('sales.created', new CacheInvalidationHandler());

    // 生产工单事件处理器
    eventBus.subscribe('workorder.completed', new InventorySyncHandler());
    eventBus.subscribe('workorder.completed', new FinanceVoucherHandler());
    eventBus.subscribe('workorder.completed', new QrCodeGenerationHandler());
    eventBus.subscribe('workorder.completed', new AuditLogHandler());
    eventBus.subscribe('workorder.completed', new CacheInvalidationHandler());

    // 油墨和网版成本处理器
    eventBus.subscribe('workorder.completed', new InkCostHandler());
    eventBus.subscribe('workorder.completed', new ScreenPlateCostHandler());

    eventBus.subscribe('workorder.material_issued', new InventorySyncHandler());
    eventBus.subscribe('workorder.material_issued', new AuditLogHandler());

    eventBus.subscribe('workorder.created', new AuditLogHandler());
    eventBus.subscribe('workorder.created', new CacheInvalidationHandler());

    eventBus.subscribe('workorder.released', new AuditLogHandler());
    eventBus.subscribe('workorder.started', new AuditLogHandler());

    // 入库单事件处理器
    eventBus.subscribe('inbound.approved', new InventorySyncHandler());
    eventBus.subscribe('inbound.approved', new FinanceVoucherHandler());
    eventBus.subscribe('inbound.approved', new QrCodeGenerationHandler());
    eventBus.subscribe('inbound.approved', new AuditLogHandler());
    eventBus.subscribe('inbound.approved', new CacheInvalidationHandler());

    // 采购事件处理器
    eventBus.subscribe('purchase.approved', new AuditLogHandler());
    eventBus.subscribe('purchase.received', new InventorySyncHandler());
    eventBus.subscribe('purchase.received', new FinanceVoucherHandler());
    eventBus.subscribe('purchase.received', new AuditLogHandler());

    this.initialized = true;
    secureLog('info', 'Event registry initialized', {
      salesHandlers: eventBus.getHandlerCount('sales.approved'),
      workOrderHandlers: eventBus.getHandlerCount('workorder.completed'),
      inboundHandlers: eventBus.getHandlerCount('inbound.approved'),
      inkCostHandler: eventBus.getHandlerCount('workorder.completed'),
    });
  }
}
