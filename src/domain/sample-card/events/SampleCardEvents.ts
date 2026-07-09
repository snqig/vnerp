/**
 * 打样工艺卡 — 领域事件
 *
 * 依据: docs/打样工艺卡录入页统一完善方案.md (阶段 3/4/5)
 * 事件经 DomainEventOutbox 持久化到 domain_event_outbox 表。
 */
export interface DomainEvent {
  eventId: string;
  eventType: string;
  occurredAt: Date;
  payload: Loose;
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/** 报价单已生成（阶段 3） */
export class SampleCardQuoteGeneratedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'SampleCardQuoteGenerated';
  readonly occurredAt: Date;
  readonly payload: {
    cardId: number;
    quoteId: number;
    quoteNo: string;
    quotedPrice: number;
    markupRate: number;
    userId: number;
  };

  constructor(props: {
    cardId: number;
    quoteId: number;
    quoteNo: string;
    quotedPrice: number;
    markupRate: number;
    userId: number;
  }) {
    this.eventId = genId('sc_quote');
    this.occurredAt = new Date();
    this.payload = props;
  }
}

/** 工艺卡已转正式生产工单（阶段 4） */
export class SampleCardConvertedToWorkOrderEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'SampleCardConvertedToWorkOrder';
  readonly occurredAt: Date;
  readonly payload: {
    cardId: number;
    workOrderId: number;
    workOrderNo: string;
    planQty: number;
    userId: number;
  };

  constructor(props: {
    cardId: number;
    workOrderId: number;
    workOrderNo: string;
    planQty: number;
    userId: number;
  }) {
    this.eventId = genId('sc_wo');
    this.occurredAt = new Date();
    this.payload = props;
  }
}
