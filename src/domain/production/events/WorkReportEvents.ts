import { DomainEvent } from '../../shared/DomainTypes';

export class WorkReportCreatedEvent implements DomainEvent {
  readonly eventType = 'prod.report.created';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      reportId: number;
      reportNo: string;
      workOrderId: number;
      processName: string;
      qualifiedQty: number;
      userId: number;
    }
  ) {}
}

export class WorkReportApprovedEvent implements DomainEvent {
  readonly eventType = 'prod.report.approved';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      reportId: number;
      reportNo: string;
      workOrderId: number;
      workOrderNo: string;
      qualifiedQty: number;
      processName: string;
      toolIds: number[];
      operatorId?: number;
      operatorName?: string;
      userId: number;
    }
  ) {}
}

export class WorkReportCancelledEvent implements DomainEvent {
  readonly eventType = 'prod.report.cancelled';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      reportId: number;
      reportNo: string;
      workOrderId: number;
      reason: string;
      userId: number;
    }
  ) {}
}
