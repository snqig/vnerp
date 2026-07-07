import { DomainEvent } from '../../shared/DomainTypes';

export class PayableCreatedEvent implements DomainEvent {
  readonly eventType = 'payable.created';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      payableId: number;
      payableNo: string;
      sourceType: number;
      sourceId?: number;
      sourceNo?: string;
      supplierId: number;
      amount: number;
      dueDate?: string;
    }
  ) {}
}

export class PayablePartialPaidEvent implements DomainEvent {
  readonly eventType = 'payable.partial_paid';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      payableId: number;
      payableNo: string;
      supplierId: number;
      paidAmount: number;
      balance: number;
      paymentNo?: string;
    }
  ) {}
}

export class PayableSettledEvent implements DomainEvent {
  readonly eventType = 'payable.settled';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      payableId: number;
      payableNo: string;
      supplierId: number;
      totalAmount: number;
    }
  ) {}
}
