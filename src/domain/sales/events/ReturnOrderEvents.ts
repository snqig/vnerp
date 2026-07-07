import { DomainEvent } from '../../shared/DomainTypes';

export class ReturnOrderCreatedEvent implements DomainEvent {
  readonly eventType = 'return_order.created';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      returnId: number;
      returnNo: string;
      orderId: number;
      customerId: number;
      warehouseId: number;
      reason: string;
      lines: Array<{
        materialId: number;
        materialCode: string;
        materialName: string;
        quantity: number;
        unit: string;
        batchNo: string;
        deliveryDetailId?: number;
        orderDetailId?: number;
      }>;
    }
  ) {}
}

export class ReturnOrderApprovedEvent implements DomainEvent {
  readonly eventType = 'return_order.approved';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      returnId: number;
      returnNo: string;
      orderId: number;
      customerId: number;
      approvedBy: number;
    }
  ) {}
}

export class ReturnOrderCompletedEvent implements DomainEvent {
  readonly eventType = 'return_order.completed';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      returnId: number;
      returnNo: string;
      orderId: number;
      customerId: number;
      warehouseId: number;
      inboundOrderId?: number;
      inboundOrderNo?: string;
      receivableId?: number;
      receivableNo?: string;
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

export class ReturnOrderCancelledEvent implements DomainEvent {
  readonly eventType = 'return_order.cancelled';
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
