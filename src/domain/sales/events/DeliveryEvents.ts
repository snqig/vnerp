import { DomainEvent } from '../../shared/DomainTypes';

export class DeliveryCreatedEvent implements DomainEvent {
  readonly eventType = 'delivery.created';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      deliveryId: number;
      deliveryNo: string;
      orderId: number;
      customerId: number;
      warehouseId: number;
      lines: Array<{
        materialId: number;
        materialCode: string;
        materialName: string;
        quantity: number;
        unit: string;
        batchNo: string;
        orderDetailId?: number;
      }>;
    }
  ) {}
}

export class DeliveryShippedEvent implements DomainEvent {
  readonly eventType = 'delivery.shipped';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      deliveryId: number;
      deliveryNo: string;
      orderId: number;
      customerId: number;
      warehouseId: number;
      logisticsCompany: string;
      trackingNo: string;
      shippedItems: Array<{
        materialId: number;
        materialCode: string;
        materialName: string;
        quantity: number;
        unit: string;
        unitPrice: number;
        batchNo: string;
        orderDetailId?: number;
      }>;
      totalAmount: number;
    }
  ) {}
}

export class DeliverySignedEvent implements DomainEvent {
  readonly eventType = 'delivery.signed';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      deliveryId: number;
      deliveryNo: string;
      orderId: number;
      customerId: number;
      signedBy?: number;
    }
  ) {}
}

export class DeliveryCancelledEvent implements DomainEvent {
  readonly eventType = 'delivery.cancelled';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      deliveryId: number;
      deliveryNo: string;
      orderId: number;
      reason?: string;
    }
  ) {}
}
