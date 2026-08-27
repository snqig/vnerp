import { DomainError } from '../../shared/DomainTypes';

/** 工单状态：与 prod_work_order.status 字段对齐 */
export type WorkOrderStatus =
  | 'draft'
  | 'approved'
  | 'picking'
  | 'in_progress'
  | 'completed'
  | 'closed'
  | 'cancelled';

export class WorkOrderStatusVO {
  private constructor(public readonly value: WorkOrderStatus) {}

  static draft(): WorkOrderStatusVO {
    return new WorkOrderStatusVO('draft');
  }
  static approved(): WorkOrderStatusVO {
    return new WorkOrderStatusVO('approved');
  }
  static picking(): WorkOrderStatusVO {
    return new WorkOrderStatusVO('picking');
  }
  static inProgress(): WorkOrderStatusVO {
    return new WorkOrderStatusVO('in_progress');
  }
  static completed(): WorkOrderStatusVO {
    return new WorkOrderStatusVO('completed');
  }
  static closed(): WorkOrderStatusVO {
    return new WorkOrderStatusVO('closed');
  }
  static cancelled(): WorkOrderStatusVO {
    return new WorkOrderStatusVO('cancelled');
  }

  static from(value: string): WorkOrderStatusVO {
    const validStatuses: WorkOrderStatus[] = [
      'draft',
      'approved',
      'picking',
      'in_progress',
      'completed',
      'closed',
      'cancelled',
    ];
    if (!validStatuses.includes(value as WorkOrderStatus)) {
      throw new DomainError(`无效的工单状态: ${value}`);
    }
    return new WorkOrderStatusVO(value as WorkOrderStatus);
  }

  static fromDbCode(code: number): WorkOrderStatusVO {
    const map: Record<number, WorkOrderStatus> = {
      1: 'draft',
      2: 'approved',
      3: 'picking',
      4: 'in_progress',
      5: 'completed',
      6: 'closed',
      7: 'cancelled',
    };
    const status = map[code];
    if (!status) throw new DomainError(`无效的工单状态码: ${code}`);
    return new WorkOrderStatusVO(status);
  }

  toDbCode(): number {
    const map: Record<WorkOrderStatus, number> = {
      draft: 1,
      approved: 2,
      picking: 3,
      in_progress: 4,
      completed: 5,
      closed: 6,
      cancelled: 7,
    };
    return map[this.value];
  }

  private static transitions: Record<WorkOrderStatus, WorkOrderStatus[]> = {
    draft: ['approved', 'cancelled'],
    approved: ['picking', 'cancelled'],
    picking: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'cancelled'],
    completed: ['closed'],
    closed: [],
    cancelled: [],
  };

  canTransitionTo(target: WorkOrderStatus): boolean {
    return WorkOrderStatusVO.transitions[this.value].includes(target);
  }

  transitionTo(target: WorkOrderStatus): WorkOrderStatusVO {
    if (!this.canTransitionTo(target)) {
      throw new DomainError(
        `工单状态流转不合法: ${this.label()} -> ${WorkOrderStatusVO.from(target).label()}`
      );
    }
    return new WorkOrderStatusVO(target);
  }

  canEdit(): boolean {
    return this.value === 'draft';
  }
  canDelete(): boolean {
    return this.value === 'draft';
  }
  canApprove(): boolean {
    return this.value === 'draft';
  }
  canPick(): boolean {
    return this.value === 'approved';
  }
  canStart(): boolean {
    return this.value === 'approved' || this.value === 'picking';
  }
  canComplete(): boolean {
    return this.value === 'in_progress';
  }
  canClose(): boolean {
    return this.value === 'completed';
  }
  canCancel(): boolean {
    return !['closed', 'cancelled', 'completed'].includes(this.value);
  }

  label(): string {
    const labels: Record<WorkOrderStatus, string> = {
      draft: '草稿',
      approved: '已审核',
      picking: '领料中',
      in_progress: '生产中',
      completed: '已完工',
      closed: '已结案',
      cancelled: '已作废',
    };
    return labels[this.value];
  }

  equals(other: WorkOrderStatusVO): boolean {
    return this.value === other.value;
  }
}
