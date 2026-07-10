import { DomainEvent } from '../../shared/DomainTypes';

export class PickOrderCreatedEvent implements DomainEvent {
  readonly eventType = 'prod.pick.created';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      pickOrderId: number;
      pickNo: string;
      workOrderId: number;
      userId: number;
    }
  ) {}
}

export class PickOrderApprovedEvent implements DomainEvent {
  readonly eventType = 'prod.pick.approved';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      pickOrderId: number;
      pickNo: string;
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

export class MaterialReturnApprovedEvent implements DomainEvent {
  readonly eventType = 'prod.return.approved';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      returnId: number;
      returnNo: string;
      workOrderId: number | null;
      workOrderNo: string | null;
      warehouseId: number;
      operatorName: string | null;
      items: Array<{
        materialId: number;
        materialCode: string | null;
        materialName: string | null;
        quantity: number;
        unit: string | null;
        batchNo: string | null;
        unitPrice?: number;
      }>;
    }
  ) {}
}

export class PickOrderCancelledEvent implements DomainEvent {
  readonly eventType = 'prod.pick.cancelled';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      pickOrderId: number;
      pickNo: string;
      workOrderId: number;
      reason: string;
      userId: number;
    }
  ) {}
}
