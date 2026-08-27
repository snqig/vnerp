import { DomainEvent } from '../../shared/DomainTypes';

export class SplitOrderCreatedEvent implements DomainEvent {
  readonly eventType = 'split_order.created';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      splitId: number;
      splitNo: string;
      parentBatchId: number;
      materialId: number;
      warehouseId: number;
      childBatchIds: number[];
      totalCost: number;
    }
  ) {}
}

export class SplitOrderAuditedEvent implements DomainEvent {
  readonly eventType = 'split_order.audited';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      splitId: number;
      splitNo: string;
      parentBatchId: number;
      materialId: number;
      warehouseId: number;
      childBatchIds: number[];
      totalCost: number;
      auditorId: number;
      auditorName: string;
    }
  ) {}
}
