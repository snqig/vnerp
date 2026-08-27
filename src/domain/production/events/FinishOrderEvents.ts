import { DomainEvent } from '../../shared/DomainTypes';

export class FinishOrderCreatedEvent implements DomainEvent {
  readonly eventType = 'prod.finish.created';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      finishOrderId: number;
      finishNo: string;
      workOrderId: number;
      warehouseId: number;
      qualifiedQty: number;
      userId: number;
    }
  ) {}
}

export class FinishOrderApprovedEvent implements DomainEvent {
  readonly eventType = 'prod.finish.approved';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      finishOrderId: number;
      finishNo: string;
      workOrderId: number;
      workOrderNo: string;
      productName: string;
      qualifiedQty: number;
      defectiveQty: number;
      warehouseId: number;
      userId: number;
    }
  ) {}
}

export class FinishOrderCancelledEvent implements DomainEvent {
  readonly eventType = 'prod.finish.cancelled';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      finishOrderId: number;
      finishNo: string;
      workOrderId: number;
      reason: string;
      userId: number;
    }
  ) {}
}
