/**
 * 采购 & 销售领域事件统一定义入口
 *
 * 本文件作为统一 barrel，重新导出所有采购、销售、仓储相关领域事件。
 * 后续模块（库存联动、应收应付生成、对账联动）只需从此处导入。
 *
 * 事件映射表（计划命名 → 实际事件类）：
 *   PurInboundApprovedEvent        → InboundOrderApprovedEvent   (inbound.approved)
 *   PurReturnApprovedEvent         → PurchaseReturnApprovedEvent (purchase_return.approved)
 *   PurReconciliationConfirmedEvent→ PurchaseReconciliationConfirmedEvent (purchase_reconciliation.confirmed)
 *   SalDeliveryApprovedEvent       → DeliveryShippedEvent        (delivery.shipped)
 *   SalReturnApprovedEvent         → ReturnOrderApprovedEvent    (return_order.approved)
 *   SalReconciliationConfirmedEvent→ ReconciliationConfirmedEvent(reconciliation.confirmed)
 *
 * 通用字段约定：
 *   - 单据 ID：payload 中的 *Id 字段（inboundId/returnId/reconciliationId 等）
 *   - 单据号：payload 中的 *No 字段（inboundNo/returnNo/reconciliationNo 等）
 *   - 操作人 ID：payload 中的 approvedBy/confirmedBy 字段
 *   - 操作时间：occurredAt（由事件构造时自动设置）
 *   - 租户标识：当前项目为单租户架构，不设 tenantId；如未来需多租户，在 DomainEvent 接口扩展
 */

// ============ 采购领域事件 ============
export {
  PurchaseOrderCreatedEvent,
  PurchaseOrderSubmittedEvent,
  PurchaseOrderApprovedEvent,
  PurchaseOrderReceivedEvent,
  PurchaseOrderClosedEvent,
} from '../../purchase/events/PurchaseOrderEvents';

export {
  PurchaseReturnCreatedEvent,
  PurchaseReturnApprovedEvent,
  PurchaseReturnCompletedEvent,
  PurchaseReturnCancelledEvent,
} from '../../purchase/events/PurchaseReturnEvents';

export {
  PurchaseReconciliationCreatedEvent,
  PurchaseReconciliationConfirmedEvent,
  PurchaseReconciliationPartialWrittenOffEvent,
  PurchaseReconciliationWrittenOffEvent,
  PurchaseReconciliationClosedEvent,
} from '../../purchase/events/PurchaseReconciliationEvents';

// ============ 销售领域事件 ============
export {
  SalesOrderCreatedEvent,
  SalesOrderSubmittedEvent,
  SalesOrderApprovedEvent,
  SalesOrderShippedEvent,
  SalesOrderClosedEvent,
} from '../../sales/events/SalesOrderEvents';

export {
  DeliveryCreatedEvent,
  DeliveryShippedEvent,
  DeliverySignedEvent,
  DeliveryCancelledEvent,
} from '../../sales/events/DeliveryEvents';

export {
  ReturnOrderCreatedEvent,
  ReturnOrderApprovedEvent,
  ReturnOrderCompletedEvent,
  ReturnOrderCancelledEvent,
} from '../../sales/events/ReturnOrderEvents';

export {
  ReconciliationCreatedEvent,
  ReconciliationConfirmedEvent,
  ReconciliationPartialWrittenOffEvent,
  ReconciliationWrittenOffEvent,
} from '../../sales/events/ReconciliationEvents';

// ============ 仓储领域事件（采购入库 & 销售出库联动用） ============
export {
  InboundOrderApprovedEvent,
  InboundOrderCreatedEvent,
  InboundOrderSubmittedEvent,
  InboundOrderCancelledEvent,
} from '../../warehouse/events/InboundOrderEvents';

export {
  OutboundOrderApprovedEvent,
  OutboundOrderCreatedEvent,
  OutboundOrderSubmittedEvent,
  OutboundOrderCancelledEvent,
} from '../../warehouse/events/OutboundOrderEvents';

// ============ 印前领域事件 ============
export {
  FormulaVersionActivatedEvent,
  FormulaVersionCancelledEvent,
} from '../../dcprint/events/FormulaVersionEvents';

export {
  ToolCreatedEvent,
  ToolActivatedEvent,
  ToolMaintenanceStartedEvent,
  ToolMaintenanceCompletedEvent,
  ToolWarningTriggeredEvent,
  ToolScrappedEvent,
  ToolUsedEvent,
} from '../../dcprint/events/ToolEvents';

export { ProcessCardConfirmedEvent } from '../../dcprint/events/ProcessCardEvents';

// ============ 生产领域事件 ============
export {
  WorkOrderCreatedEvent,
  WorkOrderApprovedEvent,
  WorkOrderStartedEvent,
  WorkOrderPickingEvent,
  WorkOrderMaterialIssuedEvent,
  WorkOrderCompletedEvent,
  WorkOrderClosedEvent,
  WorkOrderCancelledEvent,
  WorkReportedEvent,
} from '../../production/events/WorkOrderEvents';

export {
  PickOrderCreatedEvent,
  PickOrderApprovedEvent,
  MaterialReturnApprovedEvent,
  PickOrderCancelledEvent,
} from '../../production/events/PickOrderEvents';

export {
  ReturnOrderCreatedEvent as ProdReturnOrderCreatedEvent,
  ReturnOrderApprovedEvent as ProdReturnOrderApprovedEvent,
  ReturnOrderCancelledEvent as ProdReturnOrderCancelledEvent,
} from '../../production/events/ReturnOrderEvents';

export {
  FinishOrderCreatedEvent,
  FinishOrderApprovedEvent,
  FinishOrderCancelledEvent,
} from '../../production/events/FinishOrderEvents';

export {
  WorkReportCreatedEvent,
  WorkReportApprovedEvent,
  WorkReportCancelledEvent,
} from '../../production/events/WorkReportEvents';

// ============ 打样领域事件 ============
export {
  SampleOrderCreatedEvent,
  SampleOrderSubmittedEvent,
  SampleOrderStartedEvent,
  SampleOrderCompletedEvent,
  SampleOrderConfirmedEvent,
  SampleOrderConvertedEvent,
  SampleOrderCancelledEvent,
} from '../../sample/events/SampleOrderEvents';
