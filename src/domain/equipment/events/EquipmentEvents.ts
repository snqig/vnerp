import { DomainEvent } from '@/domain/shared/DomainEvent';

export class EquipmentCreatedEvent implements DomainEvent {
  readonly eventType = 'equipment.created';
  readonly occurredAt = new Date();
  constructor(public readonly payload: Record<string, unknown>) {}
}

export class EquipmentStatusChangedEvent implements DomainEvent {
  readonly eventType = 'equipment.status_changed';
  readonly occurredAt = new Date();
  constructor(public readonly payload: Record<string, unknown>) {}
}

export class EquipmentMaintenanceStartedEvent implements DomainEvent {
  readonly eventType = 'equipment.maintenance_started';
  readonly occurredAt = new Date();
  constructor(public readonly payload: Record<string, unknown>) {}
}

export class EquipmentMaintenanceCompletedEvent implements DomainEvent {
  readonly eventType = 'equipment.maintenance_completed';
  readonly occurredAt = new Date();
  constructor(public readonly payload: Record<string, unknown>) {}
}

export class EquipmentScrappedEvent implements DomainEvent {
  readonly eventType = 'equipment.scrapped';
  readonly occurredAt = new Date();
  constructor(public readonly payload: Record<string, unknown>) {}
}
