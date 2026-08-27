import { DomainEvent } from '../../shared/DomainTypes';

export class TransferOrderCreatedEvent implements DomainEvent {
  readonly eventType = 'transfer.created';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      transferId: number;
      transferNo: string;
      fromWarehouseId: number;
      toWarehouseId: number;
      transferType: number;
    }
  ) {}
}

export class TransferOrderSubmittedEvent implements DomainEvent {
  readonly eventType = 'transfer.submitted';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      transferId: number;
      transferNo: string;
      fromWarehouseId: number;
      toWarehouseId: number;
      totalQuantity: number;
    }
  ) {}
}

export class TransferOrderApprovedEvent implements DomainEvent {
  readonly eventType = 'transfer.approved';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      transferId: number;
      transferNo: string;
      approverId?: number;
    }
  ) {}
}

export class TransferOrderShippedEvent implements DomainEvent {
  readonly eventType = 'transfer.shipped';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      transferId: number;
      transferNo: string;
      fromWarehouseId: number;
      toWarehouseId: number;
      items: Array<{
        materialId: number;
        materialCode: string;
        materialName: string;
        outQuantity: number;
        batchNo: string;
      }>;
    }
  ) {}
}

export class TransferOrderReceivedEvent implements DomainEvent {
  readonly eventType = 'transfer.received';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      transferId: number;
      transferNo: string;
      fromWarehouseId: number;
      toWarehouseId: number;
      items: Array<{
        materialId: number;
        materialCode: string;
        materialName: string;
        inQuantity: number;
        batchNo: string;
      }>;
    }
  ) {}
}

export class TransferOrderCancelledEvent implements DomainEvent {
  readonly eventType = 'transfer.cancelled';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      transferId: number;
      transferNo: string;
      reason: string;
    }
  ) {}
}
