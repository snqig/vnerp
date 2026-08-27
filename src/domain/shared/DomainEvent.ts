export interface DomainEvent {
  eventType: string;
  occurredAt: Date;
  payload: Record<string, unknown>;
}
