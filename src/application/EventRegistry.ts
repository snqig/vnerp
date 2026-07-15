import { getEventBus, EventBus } from '@/infrastructure/event-bus/EventBus';
import { IdempotentHandler } from '@/infrastructure/event-bus/IdempotentHandler';
import { secureLog } from '@/lib/logger';

import { SalesToWorkOrderHandler } from '@/application/handlers/SalesToWorkOrderHandler';
import { SalesShippedHandler } from '@/application/handlers/SalesShippedHandler';
import { SalesReceivableHandler } from '@/application/handlers/SalesReceivableHandler';
import { DeliveryShippedHandler } from '@/application/handlers/DeliveryShippedHandler';
import { DeliveryReceivableHandler } from '@/application/handlers/DeliveryReceivableHandler';
import { DeliveryCancelledHandler } from '@/application/handlers/DeliveryCancelledHandler';
import { ReconciliationWriteOffHandler } from '@/application/handlers/ReconciliationWriteOffHandler';
import { ReturnOrderInventoryHandler } from '@/application/handlers/ReturnOrderInventoryHandler';
import { FormulaVersionActivatedHandler } from '@/application/handlers/FormulaVersionEventHandler';
import { FormulaVersionCancelledHandler } from '@/application/handlers/FormulaVersionEventHandler';
import { InventorySyncHandler } from '@/application/handlers/InventorySyncHandler';
import { InventoryRollbackHandler } from '@/application/handlers/InventoryRollbackHandler';
import { FinanceVoucherHandler } from '@/application/handlers/FinanceVoucherHandler';
import { QrCodeGenerationHandler } from '@/application/handlers/QrCodeGenerationHandler';
import { AuditLogHandler } from '@/application/handlers/AuditLogHandler';
import { CacheInvalidationHandler } from '@/application/handlers/CacheInvalidationHandler';
import { InkCostHandler } from '@/application/handlers/InkCostHandler';
import { ScreenPlateCostHandler } from '@/application/handlers/ScreenPlateCostHandler';
import { PurchaseApprovedHandler } from '@/application/handlers/PurchaseApprovedHandler';
import { PurchaseInboundSyncHandler } from '@/application/handlers/PurchaseInboundSyncHandler';
import { PurchaseReturnCompletedHandler } from '@/application/handlers/PurchaseReturnCompletedHandler';
import { PurchaseReconciliationWrittenOffHandler } from '@/application/handlers/PurchaseReconciliationWrittenOffHandler';
import { WorkOrderMaterialIssuedHandler } from '@/application/handlers/WorkOrderMaterialIssuedHandler';
import { WorkOrderCompletedHandler } from '@/application/handlers/WorkOrderCompletedHandler';
import { PickOrderInventoryHandler } from '@/application/handlers/PickOrderInventoryHandler';
import { FinishOrderInventoryHandler } from '@/application/handlers/FinishOrderInventoryHandler';
import { ProductionFinanceHandler } from '@/application/handlers/ProductionFinanceHandler';
import { SampleOrderInventoryHandler } from '@/application/handlers/SampleOrderInventoryHandler';
import { SampleOrderConversionHandler } from '@/application/handlers/SampleOrderConversionHandler';
import { ToolUsageSyncHandler } from '@/application/handlers/ToolUsageSyncHandler';
import { ToolCostHandler } from '@/application/handlers/ToolCostHandler';
import { OutboundInventoryHandler } from '@/application/handlers/OutboundInventoryHandler';
import { OutboundReceivableHandler } from '@/application/handlers/OutboundReceivableHandler';
import { MaterialReturnInventoryHandler } from '@/application/handlers/MaterialReturnInventoryHandler';

/**
 * 统一事件处理器注册中心
 *
 * 合并自 src/infrastructure/config/EventRegistry.ts（已删除）。
 * 关键修正：
 * - sales.shipped 使用 SalesReceivableHandler（生成应收），不再误用 FinanceVoucherHandler
 * - inbound.approved 统一使用 InventorySyncHandler（库存同步）+ FinanceVoucherHandler（生成应付），
 *   purchase.received 路径已废弃（PurchaseReceivedHandler/PurchasePayableHandler 不再注册），
 *   收货流程统一走入库单 DDD 路径
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
    eventBus.subscribe('inbound.approved', new IdempotentHandler(new PurchaseInboundSyncHandler()));
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

    // 出库单事件
    eventBus.subscribe('outbound.created', new AuditLogHandler());
    eventBus.subscribe('outbound.submitted', new AuditLogHandler());
    eventBus.subscribe('outbound.approved', new IdempotentHandler(new OutboundInventoryHandler()));
    eventBus.subscribe('outbound.approved', new IdempotentHandler(new OutboundReceivableHandler()));
    eventBus.subscribe('outbound.approved', new AuditLogHandler());
    eventBus.subscribe('outbound.approved', new CacheInvalidationHandler());
    eventBus.subscribe('outbound.cancelled', new AuditLogHandler());
    eventBus.subscribe('outbound.cancelled', new CacheInvalidationHandler());

    // 调拨单事件
    eventBus.subscribe('transfer.created', new AuditLogHandler());
    eventBus.subscribe('transfer.submitted', new AuditLogHandler());
    eventBus.subscribe('transfer.approved', new AuditLogHandler());
    eventBus.subscribe('transfer.shipped', new AuditLogHandler());
    eventBus.subscribe('transfer.shipped', new CacheInvalidationHandler());
    eventBus.subscribe('transfer.received', new AuditLogHandler());
    eventBus.subscribe('transfer.received', new CacheInvalidationHandler());
    eventBus.subscribe('transfer.cancelled', new AuditLogHandler());
    eventBus.subscribe('transfer.cancelled', new CacheInvalidationHandler());

    // 盘点单事件
    eventBus.subscribe('stocktaking.created', new AuditLogHandler());
    eventBus.subscribe('stocktaking.started', new AuditLogHandler());
    eventBus.subscribe('stocktaking.submitted', new AuditLogHandler());
    eventBus.subscribe('stocktaking.approved', new AuditLogHandler());
    eventBus.subscribe('stocktaking.approved', new CacheInvalidationHandler());
    eventBus.subscribe('stocktaking.cancelled', new AuditLogHandler());
    eventBus.subscribe('stocktaking.cancelled', new CacheInvalidationHandler());

    // 采购事件
    eventBus.subscribe('purchase.created', new AuditLogHandler());
    eventBus.subscribe('purchase.submitted', new AuditLogHandler());

    eventBus.subscribe('purchase.approved', new IdempotentHandler(new PurchaseApprovedHandler()));
    eventBus.subscribe('purchase.approved', new AuditLogHandler());
    eventBus.subscribe('purchase.approved', new CacheInvalidationHandler());

    eventBus.subscribe('purchase.received', new AuditLogHandler());

    eventBus.subscribe('purchase.closed', new AuditLogHandler());

    // 采购退货事件
    eventBus.subscribe('purchase_return.created', new AuditLogHandler());
    eventBus.subscribe('purchase_return.approved', new AuditLogHandler());
    eventBus.subscribe(
      'purchase_return.completed',
      new IdempotentHandler(new PurchaseReturnCompletedHandler())
    );
    eventBus.subscribe('purchase_return.completed', new AuditLogHandler());
    eventBus.subscribe('purchase_return.completed', new CacheInvalidationHandler());
    eventBus.subscribe('purchase_return.cancelled', new AuditLogHandler());

    // 采购对账事件
    eventBus.subscribe('purchase_reconciliation.created', new AuditLogHandler());
    eventBus.subscribe('purchase_reconciliation.confirmed', new AuditLogHandler());
    eventBus.subscribe('purchase_reconciliation.partial_written_off', new AuditLogHandler());
    eventBus.subscribe(
      'purchase_reconciliation.written_off',
      new IdempotentHandler(new PurchaseReconciliationWrittenOffHandler())
    );
    eventBus.subscribe('purchase_reconciliation.written_off', new AuditLogHandler());
    eventBus.subscribe('purchase_reconciliation.written_off', new CacheInvalidationHandler());
    eventBus.subscribe('purchase_reconciliation.closed', new AuditLogHandler());

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

    // 送货单（Delivery）事件
    eventBus.subscribe('delivery.created', new AuditLogHandler());
    eventBus.subscribe('delivery.shipped', new IdempotentHandler(new DeliveryShippedHandler()));
    eventBus.subscribe('delivery.shipped', new IdempotentHandler(new DeliveryReceivableHandler()));
    eventBus.subscribe('delivery.shipped', new AuditLogHandler());
    eventBus.subscribe('delivery.shipped', new CacheInvalidationHandler());
    eventBus.subscribe('delivery.signed', new AuditLogHandler());
    eventBus.subscribe('delivery.signed', new CacheInvalidationHandler());
    eventBus.subscribe('delivery.cancelled', new IdempotentHandler(new DeliveryCancelledHandler()));
    eventBus.subscribe('delivery.cancelled', new AuditLogHandler());
    eventBus.subscribe('delivery.cancelled', new CacheInvalidationHandler());

    // 退货单（ReturnOrder）事件
    eventBus.subscribe('return_order.created', new AuditLogHandler());
    eventBus.subscribe('return_order.approved', new AuditLogHandler());
    eventBus.subscribe(
      'return_order.completed',
      new IdempotentHandler(new ReturnOrderInventoryHandler())
    );
    eventBus.subscribe('return_order.completed', new AuditLogHandler());
    eventBus.subscribe('return_order.completed', new CacheInvalidationHandler());
    eventBus.subscribe('return_order.cancelled', new AuditLogHandler());

    // 对账单（Reconciliation）事件
    eventBus.subscribe('reconciliation.created', new AuditLogHandler());
    eventBus.subscribe('reconciliation.confirmed', new AuditLogHandler());
    eventBus.subscribe('reconciliation.partial_written_off', new AuditLogHandler());
    eventBus.subscribe(
      'reconciliation.written_off',
      new IdempotentHandler(new ReconciliationWriteOffHandler())
    );
    eventBus.subscribe('reconciliation.written_off', new AuditLogHandler());
    eventBus.subscribe('reconciliation.written_off', new CacheInvalidationHandler());
    eventBus.subscribe('reconciliation.closed', new AuditLogHandler());

    // 生产工单事件
    eventBus.subscribe('workorder.created', new AuditLogHandler());
    eventBus.subscribe('workorder.created', new CacheInvalidationHandler());
    eventBus.subscribe('workorder.released', new AuditLogHandler());
    eventBus.subscribe('workorder.started', new AuditLogHandler());

    eventBus.subscribe('workorder.reported', new IdempotentHandler(new ToolUsageSyncHandler()));

    eventBus.subscribe(
      'workorder.material_issued',
      new IdempotentHandler(new WorkOrderMaterialIssuedHandler())
    );
    eventBus.subscribe('workorder.material_issued', new AuditLogHandler());

    // 生产领料单事件 — 库存扣减（事件驱动，替代原 route 内直接调用 FIFO）
    eventBus.subscribe(
      'prod.pick.approved',
      new IdempotentHandler(new PickOrderInventoryHandler())
    );
    eventBus.subscribe('prod.pick.approved', new AuditLogHandler());

    // 生产退料单事件 — 库存增加（事件驱动）
    eventBus.subscribe(
      'prod.return.approved',
      new IdempotentHandler(new MaterialReturnInventoryHandler())
    );
    eventBus.subscribe('prod.return.approved', new AuditLogHandler());

    eventBus.subscribe(
      'workorder.completed',
      new IdempotentHandler(new WorkOrderCompletedHandler())
    );
    eventBus.subscribe('workorder.completed', new IdempotentHandler(new FinanceVoucherHandler()));
    eventBus.subscribe('workorder.completed', new IdempotentHandler(new QrCodeGenerationHandler()));
    eventBus.subscribe('workorder.completed', new IdempotentHandler(new InkCostHandler()));
    eventBus.subscribe('workorder.completed', new IdempotentHandler(new ScreenPlateCostHandler()));
    eventBus.subscribe('workorder.completed', new IdempotentHandler(new ToolCostHandler()));
    eventBus.subscribe('workorder.completed', new AuditLogHandler());
    eventBus.subscribe('workorder.completed', new CacheInvalidationHandler());

    eventBus.subscribe('workorder.closed', new IdempotentHandler(new ProductionFinanceHandler()));
    eventBus.subscribe('workorder.closed', new AuditLogHandler());

    // 生产领料单事件
    eventBus.subscribe('prod.pick.created', new AuditLogHandler());
    eventBus.subscribe(
      'prod.pick.approved',
      new IdempotentHandler(new PickOrderInventoryHandler())
    );
    eventBus.subscribe('prod.pick.approved', new AuditLogHandler());
    eventBus.subscribe('prod.pick.approved', new CacheInvalidationHandler());
    eventBus.subscribe('prod.pick.cancelled', new AuditLogHandler());

    // 生产退料单事件
    eventBus.subscribe('material_return.created', new AuditLogHandler());
    eventBus.subscribe(
      'prod.return.approved',
      new IdempotentHandler(new ReturnOrderInventoryHandler())
    );
    eventBus.subscribe('prod.return.approved', new AuditLogHandler());
    eventBus.subscribe('prod.return.approved', new CacheInvalidationHandler());
    eventBus.subscribe('prod.return.cancelled', new AuditLogHandler());

    // 生产报工单事件
    eventBus.subscribe('prod.report.created', new AuditLogHandler());
    eventBus.subscribe(
      'prod.report.approved',
      new IdempotentHandler(new WorkOrderMaterialIssuedHandler())
    );
    eventBus.subscribe('prod.report.approved', new AuditLogHandler());
    eventBus.subscribe('prod.report.cancelled', new AuditLogHandler());

    // 完工入库单事件
    eventBus.subscribe('prod.finish.created', new AuditLogHandler());
    eventBus.subscribe(
      'prod.finish.approved',
      new IdempotentHandler(new FinishOrderInventoryHandler())
    );
    eventBus.subscribe('prod.finish.approved', new AuditLogHandler());
    eventBus.subscribe('prod.finish.approved', new CacheInvalidationHandler());
    eventBus.subscribe('prod.finish.cancelled', new AuditLogHandler());

    // 质量不合格品事件
    eventBus.subscribe('quality.unqualified.created', new AuditLogHandler());
    eventBus.subscribe('quality.unqualified.handling_started', new AuditLogHandler());
    eventBus.subscribe('quality.unqualified.completed', new AuditLogHandler());
    eventBus.subscribe('quality.unqualified.completed', new CacheInvalidationHandler());

    // 印前油墨配方事件
    eventBus.subscribe('inkFormulaVersion.activated', new AuditLogHandler());
    eventBus.subscribe('inkFormulaVersion.activated', new CacheInvalidationHandler());
    eventBus.subscribe('inkFormulaVersion.cancelled', new AuditLogHandler());
    eventBus.subscribe('inkFormulaVersion.cancelled', new CacheInvalidationHandler());

    // 工装（刀模/网版）寿命事件
    eventBus.subscribe('tool.created', new AuditLogHandler());
    eventBus.subscribe('tool.created', new CacheInvalidationHandler());
    eventBus.subscribe('tool.activated', new AuditLogHandler());
    eventBus.subscribe('tool.activated', new CacheInvalidationHandler());
    eventBus.subscribe('tool.maintenance_started', new AuditLogHandler());
    eventBus.subscribe('tool.maintenance_started', new CacheInvalidationHandler());
    eventBus.subscribe('tool.maintenance_completed', new AuditLogHandler());
    eventBus.subscribe('tool.maintenance_completed', new CacheInvalidationHandler());
    eventBus.subscribe('tool.warning_triggered', new AuditLogHandler());
    eventBus.subscribe('tool.warning_triggered', new CacheInvalidationHandler());
    eventBus.subscribe('tool.scrapped', new AuditLogHandler());
    eventBus.subscribe('tool.scrapped', new CacheInvalidationHandler());

    // 油墨配方版本事件
    eventBus.subscribe(
      'inkFormulaVersion.activated',
      new IdempotentHandler(new FormulaVersionActivatedHandler())
    );
    eventBus.subscribe('inkFormulaVersion.activated', new AuditLogHandler());
    eventBus.subscribe(
      'inkFormulaVersion.cancelled',
      new IdempotentHandler(new FormulaVersionCancelledHandler())
    );
    eventBus.subscribe('inkFormulaVersion.cancelled', new AuditLogHandler());

    // 打样单事件
    eventBus.subscribe('SampleOrderCompleted', new SampleOrderInventoryHandler());
    eventBus.subscribe('SampleOrderCompleted', new AuditLogHandler());
    eventBus.subscribe(
      'SampleOrderConverted',
      new IdempotentHandler(new SampleOrderConversionHandler())
    );
    eventBus.subscribe('SampleOrderConverted', new AuditLogHandler());
    eventBus.subscribe('SampleOrderSubmitted', new AuditLogHandler());
    eventBus.subscribe('SampleOrderStarted', new AuditLogHandler());
    eventBus.subscribe('SampleOrderConfirmed', new AuditLogHandler());
    eventBus.subscribe('SampleOrderCancelled', new AuditLogHandler());

    // 标准卡事件 — BOM 展开缓存失效
    eventBus.subscribe('StandardCardConfirmed', new CacheInvalidationHandler());
    eventBus.subscribe('StandardCardObsoleted', new CacheInvalidationHandler());

    this.initialized = true;
    secureLog('info', 'Event registry initialized', {
      inboundApprovedHandlers: eventBus.getHandlerCount('inbound.approved'),
      purchaseReceivedHandlers: eventBus.getHandlerCount('purchase.received'),
      salesShippedHandlers: eventBus.getHandlerCount('sales.shipped'),
      deliveryShippedHandlers: eventBus.getHandlerCount('delivery.shipped'),
      returnOrderCompletedHandlers: eventBus.getHandlerCount('return_order.completed'),
      reconciliationWrittenOffHandlers: eventBus.getHandlerCount('reconciliation.written_off'),
      purchaseReturnCompletedHandlers: eventBus.getHandlerCount('purchase_return.completed'),
      purchaseReconWrittenOffHandlers: eventBus.getHandlerCount(
        'purchase_reconciliation.written_off'
      ),
      workorderCompletedHandlers: eventBus.getHandlerCount('workorder.completed'),
      qualityUnqualifiedCompletedHandlers: eventBus.getHandlerCount(
        'quality.unqualified.completed'
      ),
    });
  }

  static reset(): void {
    this.initialized = false;
  }
}

/**
 * 函数式注册入口（向后兼容）。
 * 调用类版 initialize 后返回全局 EventBus 单例，供 API 路由与 OutboxPoller 使用。
 *
 * 同时惰性启动 OutboxPoller + StreamConsumer（仅 EVENT_BUS_TYPE=db 时）。
 * 采用 require() 延迟加载以规避 EventRegistry ↔ AppInitializer ↔ OutboxPoller 循环依赖。
 * instrumentation.ts（Edge 打包）不再导入 AppInitializer，从而避免 crypto/stream 模块解析失败。
 */
let applicationInitialized = false;

export function registerEventHandlers(): EventBus {
  EventRegistry.initialize();

  if (!applicationInitialized) {
    applicationInitialized = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { initializeApplication } = require('./AppInitializer');
      initializeApplication();
    } catch (error) {
      secureLog('error', 'Failed to auto-initialize application (OutboxPoller/StreamConsumer)', {
        error: String(error),
      });
    }
  }

  return getEventBus();
}
