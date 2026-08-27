import { DomainEvent } from '../../shared/DomainTypes';

/**
 * 工装创建事件
 * 触发时机：新工装录入完成
 */
export class ToolCreatedEvent implements DomainEvent {
  readonly eventType = 'tool.created';
  readonly occurredAt = new Date();
  readonly aggregateType = 'Tool';
  public readonly aggregateId?: number;

  constructor(
    public readonly payload: {
      toolId: number;
      toolCode: string;
      toolType: number;
      toolName: string;
      totalLife: number;
      originalCost: number;
    }
  ) {
    this.aggregateId = payload.toolId;
  }
}

/**
 * 工装激活事件
 * 触发时机：工装从待激活变为可用状态
 */
export class ToolActivatedEvent implements DomainEvent {
  readonly eventType = 'tool.activated';
  readonly occurredAt = new Date();
  readonly aggregateType = 'Tool';
  public readonly aggregateId?: number;

  constructor(
    public readonly payload: {
      toolId: number;
      toolCode: string;
      toolType: number;
      toolName: string;
      totalLife: number;
    }
  ) {
    this.aggregateId = payload.toolId;
  }
}

/**
 * 工装维修开始事件
 * 触发时机：工装进入维修状态
 */
export class ToolMaintenanceStartedEvent implements DomainEvent {
  readonly eventType = 'tool.maintenance_started';
  readonly occurredAt = new Date();
  readonly aggregateType = 'Tool';
  public readonly aggregateId?: number;

  constructor(
    public readonly payload: {
      toolId: number;
      toolCode: string;
      toolType: number;
      maintenanceId: number;
      maintenanceType: number;
      remainLife: number;
    }
  ) {
    this.aggregateId = payload.toolId;
  }
}

/**
 * 工装维修完成事件
 * 触发时机：工装维修完成，恢复可用状态
 */
export class ToolMaintenanceCompletedEvent implements DomainEvent {
  readonly eventType = 'tool.maintenance_completed';
  readonly occurredAt = new Date();
  readonly aggregateType = 'Tool';
  public readonly aggregateId?: number;

  constructor(
    public readonly payload: {
      toolId: number;
      toolCode: string;
      toolType: number;
      maintenanceId: number;
      maintenanceCost: number;
      lifeAdjustment: number;
      newRemainLife: number;
      newStatus: number;
    }
  ) {
    this.aggregateId = payload.toolId;
  }
}

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

/**
 * 工装使用事件
 * 触发时机：报工审核时，联动累计关联刀模/网版的使用次数
 */
export class ToolUsedEvent implements DomainEvent {
  readonly eventType = 'tool.used';
  readonly occurredAt = new Date();
  readonly aggregateType = 'Tool';
  public readonly aggregateId?: number;

  constructor(
    public readonly payload: {
      toolId: number;
      toolCode: string;
      toolType: number;
      workOrderId: number;
      workOrderNo: string;
      processName?: string;
      useCount: number;
      usedCountAfter: number;
      remainLifeAfter: number;
      operatorId?: number;
      operatorName?: string;
    }
  ) {
    this.aggregateId = payload.toolId;
  }
}
