import { DomainEvent } from '../../shared/DomainTypes';

export class OutboundOrderCreatedEvent implements DomainEvent {
  readonly eventType = 'outbound.created';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      outboundId: number;
      outboundNo: string;
      warehouseId: number;
      outboundType: string;
      customerId?: number;
      workOrderId?: number;
    }
  ) {}
}

export class OutboundOrderSubmittedEvent implements DomainEvent {
  readonly eventType = 'outbound.submitted';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      outboundId: number;
      outboundNo: string;
      warehouseId: number;
      totalAmount: number;
      totalQuantity: number;
    }
  ) {}
}

export class OutboundOrderApprovedEvent implements DomainEvent {
  readonly eventType = 'outbound.approved';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      outboundId: number;
      outboundNo: string;
      warehouseId: number;
      warehouseName: string;
      customerId?: number;
      customerName?: string;
      items: Array<{
        materialId: number;
        materialCode: string;
        materialName: string;
        quantity: number;
        unitPrice: number;
        batchNo: string;
        batchId?: number;
      }>;
      totalAmount: number;
    }
  ) {}
}

export class OutboundOrderCancelledEvent implements DomainEvent {
  readonly eventType = 'outbound.cancelled';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      outboundId: number;
      outboundNo: string;
      reason: string;
    }
  ) {}
}
