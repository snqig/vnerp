import { DomainEvent } from '../../shared/DomainTypes';

export class ReturnOrderCreatedEvent implements DomainEvent {
  readonly eventType = 'prod.return.created';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      returnOrderId: number;
      returnNo: string;
      workOrderId: number;
      userId: number;
    }
  ) {}
}

export class ReturnOrderApprovedEvent implements DomainEvent {
  readonly eventType = 'prod.return.approved';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      returnOrderId: number;
      returnNo: string;
      workOrderId: number;
      items: Array<{
        materialId: number;
        quantity: number;
        batchNo: string;
        warehouseId: number;
      }>;
      userId: number;
    }
  ) {}
}

export class ReturnOrderCancelledEvent implements DomainEvent {
  readonly eventType = 'prod.return.cancelled';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      returnOrderId: number;
      returnNo: string;
      workOrderId: number;
      reason: string;
      userId: number;
    }
  ) {}
}
