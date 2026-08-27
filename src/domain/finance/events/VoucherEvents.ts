import { DomainEvent } from '../../shared/DomainTypes';

export class VoucherCreatedEvent implements DomainEvent {
  readonly eventType = 'voucher.created';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      voucherId: number;
      voucherNo: string;
      periodCode: string;
      voucherType: number;
      sourceType?: string;
      totalDebit: number;
      totalCredit: number;
    }
  ) {}
}

export class VoucherSubmittedEvent implements DomainEvent {
  readonly eventType = 'voucher.submitted';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      voucherId: number;
      voucherNo: string;
      periodCode: string;
    }
  ) {}
}

export class VoucherAuditedEvent implements DomainEvent {
  readonly eventType = 'voucher.audited';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      voucherId: number;
      voucherNo: string;
      auditedBy: string;
    }
  ) {}
}

export class VoucherPostedEvent implements DomainEvent {
  readonly eventType = 'voucher.posted';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      voucherId: number;
      voucherNo: string;
      periodCode: string;
      postedBy: string;
      totalDebit: number;
      totalCredit: number;
      lines: Array<{
        accountId: number;
        accountCode: string;
        debitAmount: number;
        creditAmount: number;
      }>;
    }
  ) {}
}

export class VoucherVoidedEvent implements DomainEvent {
  readonly eventType = 'voucher.voided';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      voucherId: number;
      voucherNo: string;
      reason?: string;
    }
  ) {}
}
