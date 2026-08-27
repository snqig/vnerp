import { DomainError } from '../../shared/DomainTypes';

// 对账单状态：1-草稿, 2-已确认, 3-部分核销, 4-已核销完成, 9-已关闭
export type ReconciliationStatusValue = 1 | 2 | 3 | 4 | 9;

export const ReconciliationStatusEnum = {
  DRAFT: 1,
  CONFIRMED: 2,
  PARTIAL_WRITTEN_OFF: 3,
  WRITTEN_OFF: 4,
  CLOSED: 9,
} as const;

const STATUS_LABELS: Record<number, string> = {
  1: '草稿',
  2: '已确认',
  3: '部分核销',
  4: '已核销完成',
  9: '已关闭',
};

export class ReconciliationStatus {
  private constructor(public readonly value: ReconciliationStatusValue) {}

  static draft(): ReconciliationStatus {
    return new ReconciliationStatus(1);
  }
  static confirmed(): ReconciliationStatus {
    return new ReconciliationStatus(2);
  }
  static partialWrittenOff(): ReconciliationStatus {
    return new ReconciliationStatus(3);
  }
  static writtenOff(): ReconciliationStatus {
    return new ReconciliationStatus(4);
  }
  static closed(): ReconciliationStatus {
    return new ReconciliationStatus(9);
  }
  static from(value: number): ReconciliationStatus {
    const validStatuses: ReconciliationStatusValue[] = [1, 2, 3, 4, 9];
    if (!validStatuses.includes(value as ReconciliationStatusValue)) {
      throw new DomainError(`无效的对账单状态: ${value}`);
    }
    return new ReconciliationStatus(value as ReconciliationStatusValue);
  }

  private static transitions: Record<ReconciliationStatusValue, ReconciliationStatusValue[]> = {
    1: [2],
    2: [3, 4],
    3: [4],
    4: [9],
    9: [],
  };

  canTransitionTo(target: ReconciliationStatusValue): boolean {
    return ReconciliationStatus.transitions[this.value].includes(target);
  }

  transitionTo(target: ReconciliationStatusValue): ReconciliationStatus {
    if (!this.canTransitionTo(target)) {
      throw new DomainError(
        `非法状态流转: ${STATUS_LABELS[this.value]} -> ${STATUS_LABELS[target]}`
      );
    }
    return new ReconciliationStatus(target);
  }

  canWriteOff(): boolean {
    return this.value === 2 || this.value === 3;
  }

  canClose(): boolean {
    return this.value === 4;
  }

  isTerminal(): boolean {
    return this.value === 9;
  }

  isWrittenOff(): boolean {
    return this.value === 4;
  }

  get label(): string {
    return STATUS_LABELS[this.value] || String(this.value);
  }

  equals(other: ReconciliationStatus): boolean {
    return this.value === other.value;
  }
}
