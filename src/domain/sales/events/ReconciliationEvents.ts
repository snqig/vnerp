import { DomainEvent } from '../../shared/DomainTypes';

export class ReconciliationCreatedEvent implements DomainEvent {
  readonly eventType = 'reconciliation.created';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      reconciliationId: number;
      reconciliationNo: string;
      customerId: number;
      customerName: string;
      deliveryAmount: number;
      returnAmount: number;
      netAmount: number;
      currency?: string;
      exchangeRate?: number;
      baseCurrency?: string;
      baseDeliveryAmount?: number;
      baseReturnAmount?: number;
      baseNetAmount?: number;
    }
  ) {}
}

export class ReconciliationConfirmedEvent implements DomainEvent {
  readonly eventType = 'reconciliation.confirmed';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      reconciliationId: number;
      reconciliationNo: string;
      customerId: number;
      confirmBy: number;
    }
  ) {}
}

export class ReconciliationPartialWrittenOffEvent implements DomainEvent {
  readonly eventType = 'reconciliation.partial_written_off';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      reconciliationId: number;
      reconciliationNo: string;
      receivableId: number;
      writeOffAmount: number;
      receivedAmount: number;
      balance: number;
    }
  ) {}
}

export class ReconciliationWrittenOffEvent implements DomainEvent {
  readonly eventType = 'reconciliation.written_off';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      reconciliationId: number;
      reconciliationNo: string;
      customerId: number;
      totalWriteOffAmount: number;
      writeOffRecords: Array<{
        receivableId: number;
        amount: number;
        writeOffDate: string;
      }>;
    }
  ) {}
}

export class ReconciliationClosedEvent implements DomainEvent {
  readonly eventType = 'reconciliation.closed';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      reconciliationId: number;
      reconciliationNo: string;
      customerId: number;
      closeBy: number;
    }
  ) {}
}
