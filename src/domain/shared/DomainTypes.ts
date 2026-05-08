export class DomainError extends Error {
  constructor(message: string, public readonly code: string = 'DOMAIN_ERROR') {
    super(message);
    this.name = 'DomainError';
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string) {
    super(message, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class InvalidTransitionError extends DomainError {
  constructor(from: string, to: string) {
    super(`状态流转不合法: ${from} -> ${to}`, 'INVALID_TRANSITION');
    this.name = 'InvalidTransitionError';
  }
}

export class VersionConflictError extends DomainError {
  constructor() {
    super('数据版本冲突，请刷新后重试', 'VERSION_CONFLICT');
    this.name = 'VersionConflictError';
  }
}

export interface DomainEvent {
  readonly eventType: string;
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;
}
