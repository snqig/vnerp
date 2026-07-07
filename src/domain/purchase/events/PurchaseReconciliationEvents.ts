import { DomainEvent } from '../../shared/DomainTypes';

export class PurchaseReconciliationCreatedEvent implements DomainEvent {
  readonly eventType = 'purchase_reconciliation.created';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      reconciliationId: number;
      reconciliationNo: string;
      supplierId: number;
      supplierName: string;
      receiptAmount: number;
      returnAmount: number;
      netAmount: number;
    }
  ) {}
}

export class PurchaseReconciliationConfirmedEvent implements DomainEvent {
  readonly eventType = 'purchase_reconciliation.confirmed';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      reconciliationId: number;
      reconciliationNo: string;
      supplierId: number;
      confirmBy: number;
    }
  ) {}
}

export class PurchaseReconciliationPartialWrittenOffEvent implements DomainEvent {
  readonly eventType = 'purchase_reconciliation.partial_written_off';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      reconciliationId: number;
      reconciliationNo: string;
      payableId: number;
      writeOffAmount: number;
      paidAmount: number;
      balance: number;
    }
  ) {}
}

export class PurchaseReconciliationWrittenOffEvent implements DomainEvent {
  readonly eventType = 'purchase_reconciliation.written_off';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      reconciliationId: number;
      reconciliationNo: string;
      supplierId: number;
      totalWriteOffAmount: number;
      writeOffRecords: Array<{
        payableId: number;
        amount: number;
        writeOffDate: string;
      }>;
    }
  ) {}
}

export class PurchaseReconciliationClosedEvent implements DomainEvent {
  readonly eventType = 'purchase_reconciliation.closed';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      reconciliationId: number;
      reconciliationNo: string;
      supplierId: number;
      closeBy: number;
    }
  ) {}
}
