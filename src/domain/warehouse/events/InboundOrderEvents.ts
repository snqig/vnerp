import { DomainEvent } from '../../shared/DomainTypes';

export class InboundOrderApprovedEvent implements DomainEvent {
  readonly eventType = 'inbound.approved';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      inboundId: number;
      inboundNo: string;
      warehouseId: number;
      warehouseName: string;
      supplierId: number;
      supplierName: string;
      items: Array<{
        materialId: number;
        materialCode: string;
        materialName: string;
        quantity: number;
        unitPrice: number;
        batchNo: string;
      }>;
      totalAmount: number;
    }
  ) {}
}

export class InboundOrderCreatedEvent implements DomainEvent {
  readonly eventType = 'inbound.created';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      inboundId: number;
      inboundNo: string;
      warehouseId: number;
      supplierId: number;
    }
  ) {}
}

export class InboundOrderSubmittedEvent implements DomainEvent {
  readonly eventType = 'inbound.submitted';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      inboundId: number;
      inboundNo: string;
      warehouseId: number;
      supplierId: number;
      totalAmount: number;
    }
  ) {}
}

export class InboundOrderUnapprovedEvent implements DomainEvent {
  readonly eventType = 'inbound.unapproved';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      inboundId: number;
      inboundNo: string;
      reason: string;
    }
  ) {}
}

export class InboundOrderCancelledEvent implements DomainEvent {
  readonly eventType = 'inbound.cancelled';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      inboundId: number;
      inboundNo: string;
      reason: string;
    }
  ) {}
}

export class OutboundOrderShippedEvent implements DomainEvent {
  readonly eventType = 'outbound.shipped';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      outboundId: number;
      outboundNo: string;
      customerId: number;
      customerName: string;
      items: Array<{
        materialId: number;
        materialCode: string;
        quantity: number;
        warehouseId: number;
      }>;
    }
  ) {}
}
