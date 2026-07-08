import { DomainEvent } from '../../shared/DomainTypes';
import type { HandleMethodValue } from '../value-objects/HandleMethod';

export class UnqualifiedCreatedEvent implements DomainEvent {
  readonly eventType = 'quality.unqualified.created';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      recordId: number;
      unqualifiedNo: string;
      handleNo: string;
      inspectionId: number;
      sourceType?: string;
      sourceNo?: string;
      materialId?: number;
      materialName?: string;
      quantity: number;
      defectType?: string;
      handleType?: HandleMethodValue;
    }
  ) {}
}

export class HandlingStartedEvent implements DomainEvent {
  readonly eventType = 'quality.unqualified.handling_started';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      recordId: number;
      unqualifiedNo: string;
      handleNo: string;
      handleType: HandleMethodValue;
      responsibleDept: string;
      responsiblePerson: string;
    }
  ) {}
}

export class UnqualifiedCompletedEvent implements DomainEvent {
  readonly eventType = 'quality.unqualified.completed';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      recordId: number;
      unqualifiedNo: string;
      handleNo: string;
      handler: string;
      handleResult: number;
      costAmount: number;
    }
  ) {}
}
