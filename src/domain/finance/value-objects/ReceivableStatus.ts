import { DomainError } from '../../shared/DomainTypes';

// 应收款状态：1-未收款, 2-部分收款, 3-已结清, 4-已坏账
export type ReceivableStatusValue = 1 | 2 | 3 | 4;

export const ReceivableStatusEnum = {
  UNPAID: 1,
  PARTIAL: 2,
  SETTLED: 3,
  BAD_DEBT: 4,
} as const;

const STATUS_LABELS: Record<number, string> = {
  1: '未收款',
  2: '部分收款',
  3: '已结清',
  4: '已坏账',
};

export class ReceivableStatus {
  private constructor(public readonly value: ReceivableStatusValue) {}

  static unpaid(): ReceivableStatus {
    return new ReceivableStatus(1);
  }
  static partial(): ReceivableStatus {
    return new ReceivableStatus(2);
  }
  static settled(): ReceivableStatus {
    return new ReceivableStatus(3);
  }
  static badDebt(): ReceivableStatus {
    return new ReceivableStatus(4);
  }
  static from(value: number): ReceivableStatus {
    const validStatuses: ReceivableStatusValue[] = [1, 2, 3, 4];
    if (!validStatuses.includes(value as ReceivableStatusValue)) {
      throw new DomainError(`无效的应收款状态: ${value}`);
    }
    return new ReceivableStatus(value as ReceivableStatusValue);
  }

  private static transitions: Record<ReceivableStatusValue, ReceivableStatusValue[]> = {
    1: [2, 3, 4],
    2: [3, 4],
    3: [],
    4: [],
  };

  canTransitionTo(target: ReceivableStatusValue): boolean {
    return ReceivableStatus.transitions[this.value].includes(target);
  }

  transitionTo(target: ReceivableStatusValue): ReceivableStatus {
    if (!this.canTransitionTo(target)) {
      throw new DomainError(
        `非法状态流转: ${STATUS_LABELS[this.value]} -> ${STATUS_LABELS[target]}`
      );
    }
    return new ReceivableStatus(target);
  }

  isSettled(): boolean {
    return this.value === 3;
  }

  isTerminal(): boolean {
    return this.value === 3 || this.value === 4;
  }

  get label(): string {
    return STATUS_LABELS[this.value] || String(this.value);
  }

  equals(other: ReceivableStatus): boolean {
    return this.value === other.value;
  }
}
