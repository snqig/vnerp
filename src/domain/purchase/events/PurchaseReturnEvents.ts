import { DomainEvent } from '../../shared/DomainTypes';

export class PurchaseReturnCreatedEvent implements DomainEvent {
  readonly eventType = 'purchase_return.created';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      returnId: number;
      returnNo: string;
      orderId: number;
      supplierId: number;
      warehouseId: number;
      reason: string;
      lines: Array<{
        materialId: number;
        materialCode: string;
        materialName: string;
        quantity: number;
        unit: string;
        batchNo: string;
        orderLineId?: number;
      }>;
    }
  ) {}
}

export class PurchaseReturnApprovedEvent implements DomainEvent {
  readonly eventType = 'purchase_return.approved';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      returnId: number;
      returnNo: string;
      orderId: number;
      supplierId: number;
      approvedBy: number;
    }
  ) {}
}

export class PurchaseReturnCompletedEvent implements DomainEvent {
  readonly eventType = 'purchase_return.completed';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      returnId: number;
      returnNo: string;
      orderId: number;
      supplierId: number;
      warehouseId: number;
      outboundOrderId?: number;
      outboundOrderNo?: string;
      payableId?: number;
      payableNo?: string;
      refundAmount: number;
      completedBy: number;
      items: Array<{
        materialId: number;
        materialCode: string;
        materialName: string;
        quantity: number;
        unit: string;
        batchNo: string;
      }>;
    }
  ) {}
}

export class PurchaseReturnCancelledEvent implements DomainEvent {
  readonly eventType = 'purchase_return.cancelled';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      returnId: number;
      returnNo: string;
      orderId: number;
      reason?: string;
    }
  ) {}
}
