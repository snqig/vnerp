import { DomainEvent } from '../../shared/DomainTypes';

export class FormulaVersionActivatedEvent implements DomainEvent {
  readonly eventType = 'inkFormulaVersion.activated';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      versionId: number;
      colorId: number;
      versionNo: string;
      activatedBy: number;
      theoreticalCost: number | null;
    }
  ) {}
}

export class FormulaVersionCancelledEvent implements DomainEvent {
  readonly eventType = 'inkFormulaVersion.cancelled';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      versionId: number;
      colorId: number;
      versionNo: string;
      cancelledBy: number;
      reason: string;
    }
  ) {}
}
