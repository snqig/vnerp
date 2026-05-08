import { DomainEvent } from '../../shared/DomainTypes';

export class InboundOrderApprovedEvent implements DomainEvent {
  readonly eventType = 'inbound.approved';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      orderId: number;
      orderNo: string;
      warehouseId: number;
      warehouseName: string;
      supplierName: string;
      items: Array<{
        id?: number;
        materialId: number;
        materialCode: string;
        materialName: string;
        materialSpec: string;
        batchNo: string;
        quantity: number;
        unit: string;
        unitPrice: number;
        produceDate?: string;
      }>;
      totalAmount: number;
      inboundDate: string;
    }
  ) {}
}

export class InboundOrderCancelledEvent implements DomainEvent {
  readonly eventType = 'inbound.cancelled';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      orderId: number;
      orderNo: string;
    }
  ) {}
}

export class InboundOrderCreatedEvent implements DomainEvent {
  readonly eventType = 'inbound.created';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      orderId: number;
      orderNo: string;
      warehouseId: number;
      supplierName: string;
    }
  ) {}
}

export class InboundOrderSubmittedEvent implements DomainEvent {
  readonly eventType = 'inbound.submitted';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      orderId: number;
      orderNo: string;
    }
  ) {}
}

export class InboundOrderUnapprovedEvent implements DomainEvent {
  readonly eventType = 'inbound.unapproved';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      orderId: number;
      orderNo: string;
      warehouseId: number;
      items: Array<{
        materialId: number;
        batchNo: string;
        quantity: number;
      }>;
    }
  ) {}
}
