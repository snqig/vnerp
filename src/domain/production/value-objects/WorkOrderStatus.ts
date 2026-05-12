import { DomainError } from '../../shared/DomainTypes';

export type WorkOrderStatus =
  | 'draft'
  | 'released'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'closed';

export class WorkOrderStatusVO {
  private constructor(public readonly value: WorkOrderStatus) {}

  static draft(): WorkOrderStatusVO { return new WorkOrderStatusVO('draft'); }
  static released(): WorkOrderStatusVO { return new WorkOrderStatusVO('released'); }
  static inProgress(): WorkOrderStatusVO { return new WorkOrderStatusVO('in_progress'); }
  static paused(): WorkOrderStatusVO { return new WorkOrderStatusVO('paused'); }
  static completed(): WorkOrderStatusVO { return new WorkOrderStatusVO('completed'); }
  static closed(): WorkOrderStatusVO { return new WorkOrderStatusVO('closed'); }

  static from(value: string): WorkOrderStatusVO {
    const validStatuses: WorkOrderStatus[] = ['draft', 'released', 'in_progress', 'paused', 'completed', 'closed'];
    if (!validStatuses.includes(value as WorkOrderStatus)) {
      throw new DomainError(`无效的工单状态: ${value}`);
    }
    return new WorkOrderStatusVO(value as WorkOrderStatus);
  }

  static fromDbCode(code: number): WorkOrderStatusVO {
    const map: Record<number, WorkOrderStatus> = {
      0: 'draft', 1: 'released', 2: 'in_progress', 3: 'paused', 4: 'completed', 9: 'closed',
    };
    const status = map[code];
    if (!status) throw new DomainError(`无效的工单状态码: ${code}`);
    return new WorkOrderStatusVO(status);
  }

  toDbCode(): number {
    const map: Record<WorkOrderStatus, number> = {
      draft: 0, released: 1, in_progress: 2, paused: 3, completed: 4, closed: 9,
    };
    return map[this.value];
  }

  private static transitions: Record<WorkOrderStatus, WorkOrderStatus[]> = {
    draft: ['released', 'closed'],
    released: ['in_progress', 'closed'],
    in_progress: ['paused', 'completed', 'closed'],
    paused: ['in_progress', 'closed'],
    completed: [],
    closed: [],
  };

  canTransitionTo(target: WorkOrderStatus): boolean {
    return WorkOrderStatusVO.transitions[this.value].includes(target);
  }

  transitionTo(target: WorkOrderStatus): WorkOrderStatusVO {
    if (!this.canTransitionTo(target)) {
      throw new DomainError(`工单状态流转不合法: ${this.label()} -> ${WorkOrderStatusVO.from(target).label()}`);
    }
    return new WorkOrderStatusVO(target);
  }

  canEdit(): boolean { return this.value === 'draft'; }
  canDelete(): boolean { return this.value === 'draft'; }
  canRelease(): boolean { return this.value === 'draft'; }
  canStart(): boolean { return this.value === 'released'; }
  canPause(): boolean { return this.value === 'in_progress'; }
  canResume(): boolean { return this.value === 'paused'; }
  canComplete(): boolean { return this.value === 'in_progress'; }

  label(): string {
    const labels: Record<WorkOrderStatus, string> = {
      draft: '草稿', released: '已下达', in_progress: '生产中',
      paused: '已暂停', completed: '已完成', closed: '已关闭',
    };
    return labels[this.value];
  }

  equals(other: WorkOrderStatusVO): boolean { return this.value === other.value; }
}
