export interface DomainEvent {
  eventId: string;
  eventType: string;
  occurredAt: Date;
  payload: Record<string, unknown>;
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================
// 样单事件 (Sample Order Domain Events)
// ============================================================

/** 样单创建事件 */
export class SampleOrderCreatedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'SampleOrderCreated';
  readonly occurredAt: Date;
  readonly payload: {
    sampleOrderId: number;
    orderNo: string;
    customerId: number;
    userId: number;
  };

  constructor(props: {
    sampleOrderId: number;
    orderNo: string;
    customerId: number;
    userId: number;
  }) {
    this.eventId = genId('so_created');
    this.occurredAt = new Date();
    this.payload = props;
  }
}

/** 样单提交事件 (草稿 → 待打样) */
export class SampleOrderSubmittedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'SampleOrderSubmitted';
  readonly occurredAt: Date;
  readonly payload: {
    sampleOrderId: number;
    orderNo: string;
    userId: number;
  };

  constructor(props: { sampleOrderId: number; orderNo: string; userId: number }) {
    this.eventId = genId('so_submitted');
    this.occurredAt = new Date();
    this.payload = props;
  }
}

/** 样单开始生产事件 (待打样 → 打样中) */
export class SampleOrderStartedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'SampleOrderStarted';
  readonly occurredAt: Date;
  readonly payload: {
    sampleOrderId: number;
    orderNo: string;
    userId: number;
  };

  constructor(props: { sampleOrderId: number; orderNo: string; userId: number }) {
    this.eventId = genId('so_started');
    this.occurredAt = new Date();
    this.payload = props;
  }
}

/** 样单完成事件 (打样中 → 已完成) */
export class SampleOrderCompletedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'SampleOrderCompleted';
  readonly occurredAt: Date;
  readonly payload: {
    sampleOrderId: number;
    orderNo: string;
    userId: number;
  };

  constructor(props: { sampleOrderId: number; orderNo: string; userId: number }) {
    this.eventId = genId('so_completed');
    this.occurredAt = new Date();
    this.payload = props;
  }
}

/** 样单确认事件 (已完成 → 已确认) */
export class SampleOrderConfirmedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'SampleOrderConfirmed';
  readonly occurredAt: Date;
  readonly payload: {
    sampleOrderId: number;
    orderNo: string;
    userId: number;
  };

  constructor(props: { sampleOrderId: number; orderNo: string; userId: number }) {
    this.eventId = genId('so_confirmed');
    this.occurredAt = new Date();
    this.payload = props;
  }
}

/** 样单转大货事件 (已确认 → 已转大货) */
export class SampleOrderConvertedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'SampleOrderConverted';
  readonly occurredAt: Date;
  readonly payload: {
    sampleOrderId: number;
    orderNo: string;
    salesOrderId: number;
    userId: number;
  };

  constructor(props: {
    sampleOrderId: number;
    orderNo: string;
    salesOrderId: number;
    userId: number;
  }) {
    this.eventId = genId('so_converted');
    this.occurredAt = new Date();
    this.payload = props;
  }
}

/** 样单作废事件 */
export class SampleOrderCancelledEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'SampleOrderCancelled';
  readonly occurredAt: Date;
  readonly payload: {
    sampleOrderId: number;
    orderNo: string;
    reason: string;
    userId: number;
  };

  constructor(props: { sampleOrderId: number; orderNo: string; reason: string; userId: number }) {
    this.eventId = genId('so_cancelled');
    this.occurredAt = new Date();
    this.payload = props;
  }
}
