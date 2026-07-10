// Value Objects
export { WorkOrderStatusVO } from './value-objects/WorkOrderStatus';
export type { WorkOrderStatus } from './value-objects/WorkOrderStatus';

// Aggregates
export { WorkOrder } from './aggregates/WorkOrder';
export type { WorkOrderProps } from './aggregates/WorkOrder';
export { PickOrder, PickOrderItem } from './aggregates/PickOrder';
export type { PickOrderProps, PickOrderItemProps, PickOrderStatus } from './aggregates/PickOrder';
export { WorkReport } from './aggregates/WorkReport';
export type { WorkReportProps, WorkReportStatus } from './aggregates/WorkReport';
export { FinishOrder } from './aggregates/FinishOrder';
export type { FinishOrderProps, FinishOrderStatus } from './aggregates/FinishOrder';

// Entities
export { MaterialRequirement } from './entities/MaterialRequirement';
export type { MaterialRequirementProps } from './entities/MaterialRequirement';

// Events
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
} from './events/WorkOrderEvents';
export {
  PickOrderCreatedEvent,
  PickOrderApprovedEvent,
  PickOrderCancelledEvent,
} from './events/PickOrderEvents';
export {
  ReturnOrderCreatedEvent,
  ReturnOrderApprovedEvent,
  ReturnOrderCancelledEvent,
} from './events/ReturnOrderEvents';
export {
  WorkReportCreatedEvent,
  WorkReportApprovedEvent,
  WorkReportCancelledEvent,
} from './events/WorkReportEvents';
export {
  FinishOrderCreatedEvent,
  FinishOrderApprovedEvent,
  FinishOrderCancelledEvent,
} from './events/FinishOrderEvents';

// Repository interfaces
export type { IWorkOrderRepository, WorkOrderFilters } from './repositories/IWorkOrderRepository';
export type { IPickOrderRepository, PickOrderFilters } from './repositories/IPickOrderRepository';
export type {
  IWorkReportRepository,
  WorkReportFilters,
} from './repositories/IWorkReportRepository';
export type {
  IFinishOrderRepository,
  FinishOrderFilters,
} from './repositories/IFinishOrderRepository';
