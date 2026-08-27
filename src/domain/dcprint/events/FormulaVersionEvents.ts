import { DomainEvent } from '../../shared/DomainTypes';

/**
 * 配方版本生效事件
 * 触发时机：草稿版本被激活为已生效状态
 */
export class FormulaVersionActivatedEvent implements DomainEvent {
  readonly eventType = 'inkFormulaVersion.activated';
  readonly occurredAt = new Date();
  readonly aggregateType = 'InkFormulaVersion';
  public readonly aggregateId?: number;

  constructor(
    public readonly payload: {
      versionId: number;
      colorId: number;
      versionNo: string;
      activatedBy: number;
      theoreticalCost: number | null;
    }
  ) {
    this.aggregateId = payload.versionId;
  }
}

/**
 * 配方版本作废事件
 * 触发时机：已生效版本被作废
 */
export class FormulaVersionCancelledEvent implements DomainEvent {
  readonly eventType = 'inkFormulaVersion.cancelled';
  readonly occurredAt = new Date();
  readonly aggregateType = 'InkFormulaVersion';
  public readonly aggregateId?: number;

  constructor(
    public readonly payload: {
      versionId: number;
      colorId: number;
      versionNo: string;
      cancelledBy: number;
      reason: string;
    }
  ) {
    this.aggregateId = payload.versionId;
  }
}
