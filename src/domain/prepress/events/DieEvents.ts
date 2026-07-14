import { DomainEvent } from '@/domain/shared/DomainTypes';

export class DieCreatedEvent implements DomainEvent {
  readonly eventType = 'die.created';
  readonly occurredAt = new Date();
  readonly aggregateType = 'Die';
  public aggregateId?: number;
  constructor(public readonly payload: Record<string, unknown>) {
    this.aggregateId = payload.id as number | undefined;
  }
}

export class DieStatusChangedEvent implements DomainEvent {
  readonly eventType = 'die.status_changed';
  readonly occurredAt = new Date();
  readonly aggregateType = 'Die';
  public aggregateId?: number;
  constructor(public readonly payload: Record<string, unknown>) {
    this.aggregateId = payload.id as number | undefined;
  }
}

export class DieUsageRecordedEvent implements DomainEvent {
  readonly eventType = 'die.usage_recorded';
  readonly occurredAt = new Date();
  readonly aggregateType = 'Die';
  public aggregateId?: number;
  constructor(public readonly payload: Record<string, unknown>) {
    this.aggregateId = payload.id as number | undefined;
  }
}

export class DieMaintenanceCreatedEvent implements DomainEvent {
  readonly eventType = 'die.maintenance_created';
  readonly occurredAt = new Date();
  readonly aggregateType = 'Die';
  public aggregateId?: number;
  constructor(public readonly payload: Record<string, unknown>) {
    this.aggregateId = payload.id as number | undefined;
  }
}

export class DieMaintenanceCompletedEvent implements DomainEvent {
  readonly eventType = 'die.maintenance_completed';
  readonly occurredAt = new Date();
  readonly aggregateType = 'Die';
  public aggregateId?: number;
  constructor(public readonly payload: Record<string, unknown>) {
    this.aggregateId = payload.id as number | undefined;
  }
}

export class DieScrappedEvent implements DomainEvent {
  readonly eventType = 'die.scrapped';
  readonly occurredAt = new Date();
  readonly aggregateType = 'Die';
  public aggregateId?: number;
  constructor(public readonly payload: Record<string, unknown>) {
    this.aggregateId = payload.id as number | undefined;
  }
}
