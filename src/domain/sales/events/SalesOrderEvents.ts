import { DomainEvent } from '../../shared/DomainTypes';

export class SalesOrderCreatedEvent implements DomainEvent {
  readonly eventType = 'sales.created';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      orderId: number;
      orderNo: string;
      customerId: number;
      customerName: string;
      totalAmount: number;
      currency?: string;
      exchangeRate?: number;
      baseCurrency?: string;
      baseTotalAmount?: number;
      baseTaxAmount?: number;
      baseGrandTotal?: number;
    }
  ) {}
}

export class SalesOrderSubmittedEvent implements DomainEvent {
  readonly eventType = 'sales.submitted';
  readonly occurredAt = new Date();
  constructor(public readonly payload: { orderId: number; orderNo: string }) {}
}

export class SalesOrderApprovedEvent implements DomainEvent {
  readonly eventType = 'sales.approved';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      orderId: number;
      orderNo: string;
      customerId: number;
      customerName: string;
      lines: Array<{
        materialId: number;
        materialCode: string;
        materialName: string;
        orderQty: number;
        unitPrice: number;
        remainingQty: number;
      }>;
      totalAmount: number;
    }
  ) {}
}

export class SalesOrderShippedEvent implements DomainEvent {
  readonly eventType = 'sales.shipped';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      orderId: number;
      orderNo: string;
      customerId: number;
      customerName: string;
      shippedItems: Array<{
        materialId: number;
        materialCode: string;
        materialName: string;
        quantity: number;
        unitPrice: number;
        batchNo: string;
        warehouseId: number;
      }>;
      totalShippedAmount: number;
    }
  ) {}
}

export class SalesOrderClosedEvent implements DomainEvent {
  readonly eventType = 'sales.closed';
  readonly occurredAt = new Date();
  constructor(public readonly payload: { orderId: number; orderNo: string }) {}
}
