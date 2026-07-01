// 统一使用 shared 层的 DomainEvent 接口，避免与本文件事件类形状冲突
import { DomainEvent } from '@/domain/shared/DomainTypes';
// re-export 保持现有调用方（StandardCardHandlers.ts）import 路径兼容
export type { DomainEvent };

export class StandardCardCreatedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'StandardCardCreated';
  readonly occurredAt: Date;
  readonly payload: {
    standardCardId: number;
    code: string;
    version: string;
    name: string;
    type: string;
    materialId?: number;
    customerId?: number;
    userId: number;
  };

  constructor(props: {
    standardCardId: number;
    code: string;
    version: string;
    name: string;
    type: string;
    materialId?: number;
    customerId?: number;
    userId: number;
  }) {
    this.eventId = `sc_created_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.occurredAt = new Date();
    this.payload = props;
  }
}

export class StandardCardSubmittedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'StandardCardSubmitted';
  readonly occurredAt: Date;
  readonly payload: {
    standardCardId: number;
    code: string;
    version: string;
    userId: number;
  };

  constructor(props: { standardCardId: number; code: string; version: string; userId: number }) {
    this.eventId = `sc_submitted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.occurredAt = new Date();
    this.payload = props;
  }
}

export class StandardCardApprovedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'StandardCardApproved';
  readonly occurredAt: Date;
  readonly payload: {
    standardCardId: number;
    code: string;
    version: string;
    userId: number;
    approvalLevel: 'tech_manager' | 'general_manager';
  };

  constructor(props: {
    standardCardId: number;
    code: string;
    version: string;
    userId: number;
    approvalLevel: 'tech_manager' | 'general_manager';
  }) {
    this.eventId = `sc_approved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.occurredAt = new Date();
    this.payload = props;
  }
}

export class StandardCardConfirmedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'StandardCardConfirmed';
  readonly occurredAt: Date;
  readonly payload: {
    standardCardId: number;
    code: string;
    version: string;
    materialId?: number;
    userId: number;
  };

  constructor(props: {
    standardCardId: number;
    code: string;
    version: string;
    materialId?: number;
    userId: number;
  }) {
    this.eventId = `sc_confirmed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.occurredAt = new Date();
    this.payload = props;
  }
}

export class StandardCardObsoletedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'StandardCardObsoleted';
  readonly occurredAt: Date;
  readonly payload: {
    standardCardId: number;
    code: string;
    version: string;
    reason: string;
    userId: number;
  };

  constructor(props: {
    standardCardId: number;
    code: string;
    version: string;
    reason: string;
    userId: number;
  }) {
    this.eventId = `sc_obsoleted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.occurredAt = new Date();
    this.payload = props;
  }
}

export class StandardCardLinkedToWorkOrderEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'StandardCardLinkedToWorkOrder';
  readonly occurredAt: Date;
  readonly payload: {
    standardCardId: number;
    workOrderId: number;
    workOrderNo: string;
  };

  constructor(props: { standardCardId: number; workOrderId: number; workOrderNo: string }) {
    this.eventId = `sc_linked_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.occurredAt = new Date();
    this.payload = props;
  }
}

export class StandardCardRejectedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'StandardCardRejected';
  readonly occurredAt: Date;
  readonly payload: {
    standardCardId: number;
    code: string;
    version: string;
    reason: string;
    userId: number;
  };

  constructor(props: {
    standardCardId: number;
    code: string;
    version: string;
    reason: string;
    userId: number;
  }) {
    this.eventId = `sc_rejected_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.occurredAt = new Date();
    this.payload = props;
  }
}

export class StandardCardNewVersionCreatedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'StandardCardNewVersionCreated';
  readonly occurredAt: Date;
  readonly payload: {
    parentStandardCardId: number;
    parentVersion: string;
    newVersion: string;
    code: string;
    userId: number;
  };

  constructor(props: {
    parentStandardCardId: number;
    parentVersion: string;
    newVersion: string;
    code: string;
    userId: number;
  }) {
    this.eventId = `sc_new_version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.occurredAt = new Date();
    this.payload = props;
  }
}
