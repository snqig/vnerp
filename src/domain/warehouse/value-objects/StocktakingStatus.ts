import { DomainError } from '../../shared/DomainTypes';

// 盘点单状态：0-草稿, 1-进行中, 2-待审批, 3-已审批, 4-已取消
export type StocktakingStatusValue = 0 | 1 | 2 | 3 | 4;

export const StocktakingStatusEnum = {
  DRAFT: 0,
  IN_PROGRESS: 1,
  PENDING_APPROVAL: 2,
  APPROVED: 3,
  CANCELLED: 4,
} as const;

const STATUS_LABELS: Record<number, string> = {
  0: '草稿',
  1: '进行中',
  2: '待审批',
  3: '已审批',
  4: '已取消',
};

export class StocktakingStatus {
  private constructor(public readonly value: StocktakingStatusValue) {}

  static draft(): StocktakingStatus {
    return new StocktakingStatus(0);
  }
  static inProgress(): StocktakingStatus {
    return new StocktakingStatus(1);
  }
  static pendingApproval(): StocktakingStatus {
    return new StocktakingStatus(2);
  }
  static approved(): StocktakingStatus {
    return new StocktakingStatus(3);
  }
  static cancelled(): StocktakingStatus {
    return new StocktakingStatus(4);
  }
  static from(value: number): StocktakingStatus {
    const validStatuses: StocktakingStatusValue[] = [0, 1, 2, 3, 4];
    if (!validStatuses.includes(value as StocktakingStatusValue)) {
      throw new DomainError(`无效的盘点单状态: ${value}`);
    }
    return new StocktakingStatus(value as StocktakingStatusValue);
  }

  private static transitions: Record<StocktakingStatusValue, StocktakingStatusValue[]> = {
    0: [1, 4], // draft → in_progress, cancelled
    1: [2, 4], // in_progress → pending_approval, cancelled
    2: [3, 1, 4], // pending_approval → approved, in_progress(驳回), cancelled
    3: [], // approved: terminal
    4: [], // cancelled: terminal
  };

  private static operations: Record<StocktakingStatusValue, string[]> = {
    0: ['edit', 'delete', 'start'],
    1: ['submit', 'cancel', 'view', 'scan'],
    2: ['approve', 'reject', 'cancel', 'view'],
    3: ['view'],
    4: ['view'],
  };

  canTransitionTo(target: StocktakingStatusValue): boolean {
    return StocktakingStatus.transitions[this.value].includes(target);
  }

  transitionTo(target: StocktakingStatusValue): StocktakingStatus {
    if (!this.canTransitionTo(target)) {
      throw new DomainError(
        `非法状态流转: ${STATUS_LABELS[this.value]} -> ${STATUS_LABELS[target]}`
      );
    }
    return new StocktakingStatus(target);
  }

  canEdit(): boolean {
    return StocktakingStatus.operations[this.value].includes('edit');
  }

  canDelete(): boolean {
    return StocktakingStatus.operations[this.value].includes('delete');
  }

  get label(): string {
    return STATUS_LABELS[this.value] || String(this.value);
  }

  equals(other: StocktakingStatus): boolean {
    return this.value === other.value;
  }
}
