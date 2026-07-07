import { DomainError } from '../../shared/DomainTypes';

// 退货单状态：1-待审核, 2-已审核, 3-已完成, 9-已取消
export type ReturnOrderStatusValue = 1 | 2 | 3 | 9;

export const ReturnOrderStatusEnum = {
  PENDING: 1,
  APPROVED: 2,
  COMPLETED: 3,
  CANCELLED: 9,
} as const;

const STATUS_LABELS: Record<number, string> = {
  1: '待审核',
  2: '已审核',
  3: '已完成',
  9: '已取消',
};

export class ReturnOrderStatus {
  private constructor(public readonly value: ReturnOrderStatusValue) {}

  static pending(): ReturnOrderStatus {
    return new ReturnOrderStatus(1);
  }
  static approved(): ReturnOrderStatus {
    return new ReturnOrderStatus(2);
  }
  static completed(): ReturnOrderStatus {
    return new ReturnOrderStatus(3);
  }
  static cancelled(): ReturnOrderStatus {
    return new ReturnOrderStatus(9);
  }
  static from(value: number): ReturnOrderStatus {
    const validStatuses: ReturnOrderStatusValue[] = [1, 2, 3, 9];
    if (!validStatuses.includes(value as ReturnOrderStatusValue)) {
      throw new DomainError(`无效的退货单状态: ${value}`);
    }
    return new ReturnOrderStatus(value as ReturnOrderStatusValue);
  }

  private static transitions: Record<ReturnOrderStatusValue, ReturnOrderStatusValue[]> = {
    1: [2, 9],
    2: [3, 9],
    3: [],
    9: [],
  };

  canTransitionTo(target: ReturnOrderStatusValue): boolean {
    return ReturnOrderStatus.transitions[this.value].includes(target);
  }

  transitionTo(target: ReturnOrderStatusValue): ReturnOrderStatus {
    if (!this.canTransitionTo(target)) {
      throw new DomainError(
        `非法状态流转: ${STATUS_LABELS[this.value]} -> ${STATUS_LABELS[target]}`
      );
    }
    return new ReturnOrderStatus(target);
  }

  canApprove(): boolean {
    return this.value === 1;
  }

  canComplete(): boolean {
    return this.value === 2;
  }

  canCancel(): boolean {
    return this.value === 1 || this.value === 2;
  }

  isTerminal(): boolean {
    return this.value === 3 || this.value === 9;
  }

  get label(): string {
    return STATUS_LABELS[this.value] || String(this.value);
  }

  equals(other: ReturnOrderStatus): boolean {
    return this.value === other.value;
  }
}
