import { DomainEvent } from '@/domain/shared/DomainEvent';

export class EmployeeOnboardedEvent implements DomainEvent {
  readonly eventType = 'employee.onboarded';
  readonly occurredAt = new Date();
  constructor(public readonly payload: Record<string, unknown>) {}
}

export class EmployeeConfirmedEvent implements DomainEvent {
  readonly eventType = 'employee.confirmed';
  readonly occurredAt = new Date();
  constructor(public readonly payload: Record<string, unknown>) {}
}

export class EmployeeTransferredEvent implements DomainEvent {
  readonly eventType = 'employee.transferred';
  readonly occurredAt = new Date();
  constructor(public readonly payload: Record<string, unknown>) {}
}

export class EmployeeResignedEvent implements DomainEvent {
  readonly eventType = 'employee.resigned';
  readonly occurredAt = new Date();
  constructor(public readonly payload: Record<string, unknown>) {}
}
