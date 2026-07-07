import { DomainError } from '../../shared/DomainTypes';

// 应付款状态：1-未付款, 2-部分付款, 3-已结清
export type PayableStatusValue = 1 | 2 | 3;

export const PayableStatusEnum = {
  UNPAID: 1,
  PARTIAL: 2,
  SETTLED: 3,
} as const;

const STATUS_LABELS: Record<number, string> = {
  1: '未付款',
  2: '部分付款',
  3: '已结清',
};

export class PayableStatus {
  private constructor(public readonly value: PayableStatusValue) {}

  static unpaid(): PayableStatus {
    return new PayableStatus(1);
  }
  static partial(): PayableStatus {
    return new PayableStatus(2);
  }
  static settled(): PayableStatus {
    return new PayableStatus(3);
  }
  static from(value: number): PayableStatus {
    const validStatuses: PayableStatusValue[] = [1, 2, 3];
    if (!validStatuses.includes(value as PayableStatusValue)) {
      throw new DomainError(`无效的应付款状态: ${value}`);
    }
    return new PayableStatus(value as PayableStatusValue);
  }

  private static transitions: Record<PayableStatusValue, PayableStatusValue[]> = {
    1: [2, 3],
    2: [3],
    3: [],
  };

  canTransitionTo(target: PayableStatusValue): boolean {
    return PayableStatus.transitions[this.value].includes(target);
  }

  transitionTo(target: PayableStatusValue): PayableStatus {
    if (!this.canTransitionTo(target)) {
      throw new DomainError(
        `非法状态流转: ${STATUS_LABELS[this.value]} -> ${STATUS_LABELS[target]}`
      );
    }
    return new PayableStatus(target);
  }

  isSettled(): boolean {
    return this.value === 3;
  }

  isTerminal(): boolean {
    return this.value === 3;
  }

  get label(): string {
    return STATUS_LABELS[this.value] || String(this.value);
  }

  equals(other: PayableStatus): boolean {
    return this.value === other.value;
  }
}
