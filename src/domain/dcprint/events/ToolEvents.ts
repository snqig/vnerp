import { DomainEvent } from '../../shared/DomainTypes';

/**
 * 工装预警触发事件
 * 触发时机：工装使用累计达到预警阈值
 */
export class ToolWarningTriggeredEvent implements DomainEvent {
  readonly eventType = 'tool.warning_triggered';
  readonly occurredAt = new Date();
  readonly aggregateType = 'Tool';
  public readonly aggregateId?: number;

  constructor(
    public readonly payload: {
      toolId: number;
      toolCode: string;
      toolType: number;
      usedCount: number;
      warningThreshold: number;
      totalLife: number;
      remainLife: number;
    }
  ) {
    this.aggregateId = payload.toolId;
  }
}

/**
 * 工装报废事件
 * 触发时机：工装被报废（手动或寿命耗尽自动）
 */
export class ToolScrappedEvent implements DomainEvent {
  readonly eventType = 'tool.scrapped';
  readonly occurredAt = new Date();
  readonly aggregateType = 'Tool';
  public readonly aggregateId?: number;

  constructor(
    public readonly payload: {
      toolId: number;
      toolCode: string;
      toolType: number;
      usedCount: number;
      remainLife: number;
      netValue: number;
      scrapReason: string;
      scrapBy?: number;
    }
  ) {
    this.aggregateId = payload.toolId;
  }
}
