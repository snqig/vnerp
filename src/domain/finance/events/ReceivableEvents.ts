import { DomainEvent } from '../../shared/DomainTypes';

export class ReceivableCreatedEvent implements DomainEvent {
  readonly eventType = 'receivable.created';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      receivableId: number;
      receivableNo: string;
      sourceType: number;
      sourceId?: number;
      sourceNo?: string;
      customerId: number;
      amount: number;
      dueDate?: string;
      currency?: string;
      exchangeRate?: number;
      baseAmount?: number;
    }
  ) {}
}

export class ReceivablePartialReceivedEvent implements DomainEvent {
  readonly eventType = 'receivable.partial_received';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      receivableId: number;
      receivableNo: string;
      customerId: number;
      receivedAmount: number;
      balance: number;
      receiptNo?: string;
    }
  ) {}
}

export class ReceivableSettledEvent implements DomainEvent {
  readonly eventType = 'receivable.settled';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      receivableId: number;
      receivableNo: string;
      customerId: number;
      totalAmount: number;
    }
  ) {}
}

export class ReceivableWrittenOffEvent implements DomainEvent {
  readonly eventType = 'receivable.written_off';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      receivableId: number;
      receivableNo: string;
      customerId: number;
      writtenOffAmount: number;
      reason?: string;
    }
  ) {}
}
