import { DomainEvent } from '../../shared/DomainTypes';

/**
 * 工艺卡确认事件
 * 触发时机：打样工艺卡状态从草稿变更为已确认
 * 联动：可一键生成打样类型生产工单
 */
export class ProcessCardConfirmedEvent implements DomainEvent {
  readonly eventType = 'process_card.confirmed';
  readonly occurredAt = new Date();
  readonly aggregateType = 'SampleProcessCard';
  public readonly aggregateId?: number;

  constructor(
    public readonly payload: {
      cardId: number;
      sampleNo: string;
      sampleName: string;
      customerId?: number;
      customerName?: string;
      productId?: number;
      productName?: string;
      versionNo: string;
      dieToolId?: number;
      screenPlateId?: number;
      inkColorId?: number;
      totalCost: number;
      confirmBy: number;
    }
  ) {
    this.aggregateId = payload.cardId;
  }
}
