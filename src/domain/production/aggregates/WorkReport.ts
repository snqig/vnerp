import { DomainEvent, DomainError } from '../../shared/DomainTypes';
import {
  WorkReportCreatedEvent,
  WorkReportApprovedEvent,
  WorkReportCancelledEvent,
} from '../events/WorkReportEvents';

export type WorkReportStatus = 'draft' | 'approved' | 'cancelled';

export interface WorkReportProps {
  id?: number;
  reportNo: string;
  workOrderId: number;
  processName: string;
  equipmentId?: number;
  equipmentName?: string;
  shift?: string;
  operatorName?: string;
  qualifiedQty: number;
  defectiveQty: number;
  defectReason?: string;
  workHours: number;
  reportDate?: string;
  status?: WorkReportStatus;
  createBy?: number;
  createTime?: string;
  updateTime?: string;
}

export class WorkReport {
  private _domainEvents: DomainEvent[] = [];
  private _status: WorkReportStatus;

  private constructor(
    public readonly id: number | undefined,
    public readonly reportNo: string,
    public readonly workOrderId: number,
    public readonly processName: string,
    public readonly equipmentId: number,
    public readonly equipmentName: string,
    public readonly shift: string,
    public readonly operatorName: string,
    public readonly qualifiedQty: number,
    public readonly defectiveQty: number,
    public readonly defectReason: string,
    public readonly workHours: number,
    public readonly reportDate: string,
    public readonly createBy: number | undefined,
    public readonly createTime: string | undefined,
    public readonly updateTime: string | undefined
  ) {
    this._status = 'draft';
  }

  static create(props: WorkReportProps): WorkReport {
    if (!props.reportNo) throw new DomainError('报工单号不能为空');
    if (!props.workOrderId) throw new DomainError('关联工单不能为空');
    if (!props.processName) throw new DomainError('工序名称不能为空');
    if (props.qualifiedQty <= 0 && props.defectiveQty <= 0) {
      throw new DomainError('合格数或不良数至少有一个大于0');
    }

    const report = new WorkReport(
      props.id,
      props.reportNo,
      props.workOrderId,
      props.processName,
      props.equipmentId || 0,
      props.equipmentName || '',
      props.shift || '',
      props.operatorName || '',
      props.qualifiedQty || 0,
      props.defectiveQty || 0,
      props.defectReason || '',
      props.workHours || 0,
      props.reportDate || '',
      props.createBy,
      props.createTime,
      props.updateTime
    );
    report._domainEvents.push(
      new WorkReportCreatedEvent({
        reportId: 0,
        reportNo: props.reportNo,
        workOrderId: props.workOrderId,
        processName: props.processName,
        qualifiedQty: props.qualifiedQty || 0,
        userId: props.createBy || 0,
      })
    );
    return report;
  }

  static reconstitute(props: WorkReportProps): WorkReport {
    return new WorkReport(
      props.id,
      props.reportNo,
      props.workOrderId,
      props.processName,
      props.equipmentId || 0,
      props.equipmentName || '',
      props.shift || '',
      props.operatorName || '',
      props.qualifiedQty || 0,
      props.defectiveQty || 0,
      props.defectReason || '',
      props.workHours || 0,
      props.reportDate || '',
      props.createBy,
      props.createTime,
      props.updateTime
    );
  }

  get status(): WorkReportStatus {
    return this._status;
  }

  approve(userId: number): void {
    if (this._status !== 'draft') throw new DomainError('只有草稿状态的报工单才能审核');
    this._status = 'approved';
    // Tool IDs would be resolved from process name / equipment mapping in application layer
    this._domainEvents.push(
      new WorkReportApprovedEvent({
        reportId: this.id!,
        reportNo: this.reportNo,
        workOrderId: this.workOrderId,
        workOrderNo: '',
        qualifiedQty: this.qualifiedQty,
        processName: this.processName,
        toolIds: [],
        operatorName: this.operatorName,
        userId,
      })
    );
  }

  cancel(reason: string, userId: number): void {
    if (this._status !== 'draft' && this._status !== 'approved') {
      throw new DomainError('当前状态不允许作废');
    }
    this._status = 'cancelled';
    this._domainEvents.push(
      new WorkReportCancelledEvent({
        reportId: this.id!,
        reportNo: this.reportNo,
        workOrderId: this.workOrderId,
        reason,
        userId,
      })
    );
  }

  getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }
  clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
