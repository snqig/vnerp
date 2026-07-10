import { DomainEvent } from '../../shared/DomainTypes';

export class WorkOrderCreatedEvent implements DomainEvent {
  readonly eventType = 'workorder.created';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      workOrderId: number;
      workOrderNo: string;
      productId: number;
      productName: string;
      plannedQty: number;
    }
  ) {}
}

export class WorkOrderApprovedEvent implements DomainEvent {
  readonly eventType = 'workorder.approved';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      workOrderId: number;
      workOrderNo: string;
      userId: number;
    }
  ) {}
}

export class WorkOrderStartedEvent implements DomainEvent {
  readonly eventType = 'workorder.started';
  readonly occurredAt = new Date();
  constructor(public readonly payload: { workOrderId: number; workOrderNo: string }) {}
}

export class WorkOrderPickingEvent implements DomainEvent {
  readonly eventType = 'workorder.picking';
  readonly occurredAt = new Date();
  constructor(public readonly payload: { workOrderId: number; workOrderNo: string }) {}
}

export class WorkOrderMaterialIssuedEvent implements DomainEvent {
  readonly eventType = 'workorder.material_issued';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      workOrderId: number;
      workOrderNo: string;
      issuedItems: Array<{
        materialId: number;
        materialCode: string;
        materialName: string;
        quantity: number;
        batchNo: string;
        warehouseId: number;
      }>;
    }
  ) {}
}

export class WorkOrderCompletedEvent implements DomainEvent {
  readonly eventType = 'workorder.completed';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      workOrderId: number;
      workOrderNo: string;
      productId: number;
      productName: string;
      completedQty: number;
      warehouseId: number;
    }
  ) {}
}

export class WorkOrderClosedEvent implements DomainEvent {
  readonly eventType = 'workorder.closed';
  readonly occurredAt = new Date();
  constructor(public readonly payload: { workOrderId: number; workOrderNo: string }) {}
}

export class WorkOrderCancelledEvent implements DomainEvent {
  readonly eventType = 'workorder.cancelled';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      workOrderId: number;
      workOrderNo: string;
      reason: string;
      userId: number;
    }
  ) {}
}

export class WorkReportedEvent implements DomainEvent {
  readonly eventType = 'workorder.reported';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      workOrderId: number;
      workOrderNo: string;
      reportId: number;
      completedQty: number;
      toolIds: number[];
      processName: string;
      operatorId?: number;
      operatorName?: string;
    }
  ) {}
}
