import { DomainEvent } from '../../shared/DomainTypes';

export class StocktakingOrderCreatedEvent implements DomainEvent {
  readonly eventType = 'stocktaking.created';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      stocktakingId: number;
      checkNo: string;
      warehouseId: number;
      warehouseName: string;
      stocktakingType: number;
    }
  ) {}
}

export class StocktakingOrderStartedEvent implements DomainEvent {
  readonly eventType = 'stocktaking.started';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      stocktakingId: number;
      checkNo: string;
      warehouseId: number;
    }
  ) {}
}

export class StocktakingOrderSubmittedEvent implements DomainEvent {
  readonly eventType = 'stocktaking.submitted';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      stocktakingId: number;
      checkNo: string;
      warehouseId: number;
      totalItems: number;
      diffItems: number;
    }
  ) {}
}

export class StocktakingOrderApprovedEvent implements DomainEvent {
  readonly eventType = 'stocktaking.approved';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      stocktakingId: number;
      checkNo: string;
      warehouseId: number;
      warehouseName: string;
      diffItems: Array<{
        materialId: number;
        materialCode: string;
        materialName: string;
        batchNo: string;
        diffQty: number;
        diffAmount: number;
        adjustType: number; // 1-盘盈, 2-盘亏
      }>;
      totalDiffAmount: number;
    }
  ) {}
}

export class StocktakingOrderCancelledEvent implements DomainEvent {
  readonly eventType = 'stocktaking.cancelled';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      stocktakingId: number;
      checkNo: string;
      reason: string;
    }
  ) {}
}
