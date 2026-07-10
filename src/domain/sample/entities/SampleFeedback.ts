import { DomainError } from '@/domain/shared/DomainTypes';

/** 打样反馈实体属性 — 与 sal_sample_feedback 表字段一一对齐 */
export interface SampleFeedbackProps {
  id?: number;
  sampleOrderId: number;
  round: number; // 反馈轮次
  feedbackContent?: string; // 反馈内容
  modificationRequirements?: string; // 修改要求
  confirmationStatus: string; // 确认状态: pending/approved/rejected
  feedbackBy?: number; // 反馈人
  feedbackTime?: string; // 反馈时间
  createTime?: string;
  deleted?: number;
}

export class SampleFeedback {
  private constructor(
    public readonly id: number | undefined,
    public readonly sampleOrderId: number,
    private _round: number,
    private _feedbackContent: string,
    private _modificationRequirements: string,
    private _confirmationStatus: string,
    private _feedbackBy: number | undefined,
    private _feedbackTime: string,
    public readonly createTime: string | undefined,
    public readonly deleted: number
  ) {}

  /** 创建新反馈 */
  static create(props: SampleFeedbackProps): SampleFeedback {
    if (!props.sampleOrderId) throw new DomainError('所属打样单不能为空');
    if (!props.round) throw new DomainError('反馈轮次不能为空');

    return new SampleFeedback(
      props.id,
      props.sampleOrderId,
      props.round,
      props.feedbackContent || '',
      props.modificationRequirements || '',
      props.confirmationStatus || 'pending',
      props.feedbackBy,
      props.feedbackTime || '',
      props.createTime,
      props.deleted || 0
    );
  }

  /** 从数据库重建 */
  static reconstitute(props: SampleFeedbackProps): SampleFeedback {
    return new SampleFeedback(
      props.id,
      props.sampleOrderId,
      props.round,
      props.feedbackContent || '',
      props.modificationRequirements || '',
      props.confirmationStatus,
      props.feedbackBy,
      props.feedbackTime || '',
      props.createTime,
      props.deleted || 0
    );
  }

  get round(): number {
    return this._round;
  }
  get feedbackContent(): string {
    return this._feedbackContent;
  }
  get modificationRequirements(): string {
    return this._modificationRequirements;
  }
  get confirmationStatus(): string {
    return this._confirmationStatus;
  }
  get feedbackBy(): number | undefined {
    return this._feedbackBy;
  }
  get feedbackTime(): string {
    return this._feedbackTime;
  }

  /** 确认反馈 */
  approve(): void {
    if (this._confirmationStatus !== 'pending') {
      throw new DomainError('该反馈已经处理，不能重复确认');
    }
    this._confirmationStatus = 'approved';
  }

  /** 拒绝 */
  reject(): void {
    if (this._confirmationStatus !== 'pending') {
      throw new DomainError('该反馈已经处理，不能重复拒绝');
    }
    this._confirmationStatus = 'rejected';
  }

  toProps(): SampleFeedbackProps {
    return {
      id: this.id,
      sampleOrderId: this.sampleOrderId,
      round: this._round,
      feedbackContent: this._feedbackContent,
      modificationRequirements: this._modificationRequirements,
      confirmationStatus: this._confirmationStatus,
      feedbackBy: this._feedbackBy,
      feedbackTime: this._feedbackTime,
      createTime: this.createTime,
      deleted: this.deleted,
    };
  }
}
