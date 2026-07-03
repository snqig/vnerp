import { getEventBus, EventBus } from '@/infrastructure/event-bus/EventBus';
import { IdempotentHandler } from '@/infrastructure/event-bus/IdempotentHandler';
import { secureLog } from '@/lib/logger';

import { SalesToWorkOrderHandler } from '@/application/handlers/SalesToWorkOrderHandler';
import { SalesShippedHandler } from '@/application/handlers/SalesShippedHandler';
import { SalesReceivableHandler } from '@/application/handlers/SalesReceivableHandler';
import { InventorySyncHandler } from '@/application/handlers/InventorySyncHandler';
import { InventoryRollbackHandler } from '@/application/handlers/InventoryRollbackHandler';
import { FinanceVoucherHandler } from '@/application/handlers/FinanceVoucherHandler';
import { QrCodeGenerationHandler } from '@/application/handlers/QrCodeGenerationHandler';
import { AuditLogHandler } from '@/application/handlers/AuditLogHandler';
import { CacheInvalidationHandler } from '@/application/handlers/CacheInvalidationHandler';
import { InkCostHandler } from '@/application/handlers/InkCostHandler';
import { ScreenPlateCostHandler } from '@/application/handlers/ScreenPlateCostHandler';
import { PurchaseApprovedHandler } from '@/application/handlers/PurchaseApprovedHandler';
import { PurchaseReceivedHandler } from '@/application/handlers/PurchaseReceivedHandler';
import { PurchasePayableHandler } from '@/application/handlers/PurchasePayableHandler';

/**
 * 统一事件处理器注册中心
 *
 * 合并自 src/infrastructure/config/EventRegistry.ts（已删除）。
 * 关键修正：
 * - sales.shipped 使用 SalesReceivableHandler（生成应收），不再误用 FinanceVoucherHandler
 * - purchase.received 使用 PurchaseReceivedHandler + PurchasePayableHandler，
 *   不再误用 InventorySyncHandler（PurchaseReceivedHandler 内部已做库存同步，重复订阅会导致双倍增加）
 * - workorder.material_issued 补齐 InventorySyncHandler（领料应扣减库存）
 * - workorder.completed 补齐 InkCostHandler + ScreenPlateCostHandler（油墨与网版成本归集）
 * - sales.approved 补齐 SalesToWorkOrderHandler（销售审批后自动生成工单）
 */
export class EventRegistry {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) {
      secureLog('debug', 'Event registry already initialized');
      return;
    }

    const eventBus = getEventBus();

    // 入库单事件
    eventBus.subscribe('inbound.approved', new IdempotentHandler(new InventorySyncHandler()));
    eventBus.subscribe('inbound.approved', new IdempotentHandler(new FinanceVoucherHandler()));
    eventBus.subscribe('inbound.approved', new IdempotentHandler(new QrCodeGenerationHandler()));
    eventBus.subscribe('inbound.approved', new AuditLogHandler());
    eventBus.subscribe('inbound.approved', new CacheInvalidationHandler());

    eventBus.subscribe('inbound.unapproved', new IdempotentHandler(new InventoryRollbackHandler()));
    eventBus.subscribe('inbound.unapproved', new AuditLogHandler());
    eventBus.subscribe('inbound.unapproved', new CacheInvalidationHandler());

    eventBus.subscribe('inbound.cancelled', new AuditLogHandler());
    eventBus.subscribe('inbound.cancelled', new CacheInvalidationHandler());

    eventBus.subscribe('inbound.created', new AuditLogHandler());
    eventBus.subscribe('inbound.submitted', new AuditLogHandler());

    // 采购事件
    eventBus.subscribe('purchase.created', new AuditLogHandler());
    eventBus.subscribe('purchase.submitted', new AuditLogHandler());

    eventBus.subscribe('purchase.approved', new IdempotentHandler(new PurchaseApprovedHandler()));
    eventBus.subscribe('purchase.approved', new AuditLogHandler());
    eventBus.subscribe('purchase.approved', new CacheInvalidationHandler());

    eventBus.subscribe('purchase.received', new IdempotentHandler(new PurchaseReceivedHandler()));
    eventBus.subscribe('purchase.received', new IdempotentHandler(new PurchasePayableHandler()));
    eventBus.subscribe('purchase.received', new AuditLogHandler());

    eventBus.subscribe('purchase.closed', new AuditLogHandler());

    // 销售事件
    eventBus.subscribe('sales.created', new AuditLogHandler());
    eventBus.subscribe('sales.created', new CacheInvalidationHandler());
    eventBus.subscribe('sales.submitted', new AuditLogHandler());

    eventBus.subscribe('sales.approved', new IdempotentHandler(new SalesToWorkOrderHandler()));
    eventBus.subscribe('sales.approved', new AuditLogHandler());
    eventBus.subscribe('sales.approved', new CacheInvalidationHandler());

    eventBus.subscribe('sales.shipped', new IdempotentHandler(new SalesShippedHandler()));
    eventBus.subscribe('sales.shipped', new IdempotentHandler(new SalesReceivableHandler()));
    eventBus.subscribe('sales.shipped', new AuditLogHandler());
    eventBus.subscribe('sales.shipped', new CacheInvalidationHandler());

    eventBus.subscribe('sales.closed', new AuditLogHandler());

    // 生产工单事件
    eventBus.subscribe('workorder.created', new AuditLogHandler());
    eventBus.subscribe('workorder.created', new CacheInvalidationHandler());
    eventBus.subscribe('workorder.released', new AuditLogHandler());
    eventBus.subscribe('workorder.started', new AuditLogHandler());

    eventBus.subscribe('workorder.material_issued', new IdempotentHandler(new InventorySyncHandler()));
    eventBus.subscribe('workorder.material_issued', new AuditLogHandler());

    eventBus.subscribe('workorder.completed', new IdempotentHandler(new InventorySyncHandler()));
    eventBus.subscribe('workorder.completed', new IdempotentHandler(new FinanceVoucherHandler()));
    eventBus.subscribe('workorder.completed', new IdempotentHandler(new QrCodeGenerationHandler()));
    eventBus.subscribe('workorder.completed', new IdempotentHandler(new InkCostHandler()));
    eventBus.subscribe('workorder.completed', new IdempotentHandler(new ScreenPlateCostHandler()));
    eventBus.subscribe('workorder.completed', new AuditLogHandler());
    eventBus.subscribe('workorder.completed', new CacheInvalidationHandler());

    eventBus.subscribe('workorder.closed', new AuditLogHandler());

    // 标准卡事件 — BOM 展开缓存失效
    eventBus.subscribe('StandardCardConfirmed', new CacheInvalidationHandler());
    eventBus.subscribe('StandardCardObsoleted', new CacheInvalidationHandler());

    this.initialized = true;
    secureLog('info', 'Event registry initialized', {
      inboundApprovedHandlers: eventBus.getHandlerCount('inbound.approved'),
      purchaseReceivedHandlers: eventBus.getHandlerCount('purchase.received'),
      salesShippedHandlers: eventBus.getHandlerCount('sales.shipped'),
      workorderCompletedHandlers: eventBus.getHandlerCount('workorder.completed'),
    });
  }

  static reset(): void {
    this.initialized = false;
  }
}

/**
 * 函数式注册入口（向后兼容）。
 * 调用类版 initialize 后返回全局 EventBus 单例，供 API 路由与 OutboxPoller 使用。
 */
export function registerEventHandlers(): EventBus {
  EventRegistry.initialize();
  return getEventBus();
}
