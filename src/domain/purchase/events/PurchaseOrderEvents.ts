import { DomainEvent } from '../../shared/DomainTypes';

export class PurchaseOrderCreatedEvent implements DomainEvent {
  readonly eventType = 'purchase.created';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      orderId: number;
      orderNo: string;
      supplierId: number;
      supplierName: string;
      totalAmount: number;
      totalQuantity: number;
      currency?: string;
      exchangeRate?: number;
      baseCurrency?: string;
      baseTotalAmount?: number;
      baseGrandTotal?: number;
    }
  ) {}
}

export class PurchaseOrderSubmittedEvent implements DomainEvent {
  readonly eventType = 'purchase.submitted';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      orderId: number;
      orderNo: string;
    }
  ) {}
}

export class PurchaseOrderApprovedEvent implements DomainEvent {
  readonly eventType = 'purchase.approved';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      orderId: number;
      orderNo: string;
      supplierId: number;
      supplierName: string;
      lines: Array<{
        materialId: number;
        materialCode: string;
        materialName: string;
        orderQty: number;
        unitPrice: number;
        remainingQty: number;
      }>;
      totalAmount: number;
      grandTotal: number;
    }
  ) {}
}

export class PurchaseOrderReceivedEvent implements DomainEvent {
  readonly eventType = 'purchase.received';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      orderId: number;
      orderNo: string;
      supplierId: number;
      supplierName: string;
      receivedItems: Array<{
        materialId: number;
        materialCode: string;
        materialName: string;
        quantity: number;
        unitPrice: number;
        batchNo: string;
        warehouseId: number;
      }>;
      totalReceivedAmount: number;
    }
  ) {}
}

export class PurchaseOrderClosedEvent implements DomainEvent {
  readonly eventType = 'purchase.closed';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      orderId: number;
      orderNo: string;
    }
  ) {}
}
