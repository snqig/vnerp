import { DomainError } from '../../shared/DomainTypes';

// 采购对账单状态：1-草稿, 2-已确认, 3-部分核销, 4-已核销完成, 9-已关闭
export type PurchaseReconciliationStatusValue = 1 | 2 | 3 | 4 | 9;

export const PurchaseReconciliationStatusEnum = {
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

export class PurchaseReconciliationStatus {
  private constructor(public readonly value: PurchaseReconciliationStatusValue) {}

  static draft(): PurchaseReconciliationStatus {
    return new PurchaseReconciliationStatus(1);
  }
  static confirmed(): PurchaseReconciliationStatus {
    return new PurchaseReconciliationStatus(2);
  }
  static partialWrittenOff(): PurchaseReconciliationStatus {
    return new PurchaseReconciliationStatus(3);
  }
  static writtenOff(): PurchaseReconciliationStatus {
    return new PurchaseReconciliationStatus(4);
  }
  static closed(): PurchaseReconciliationStatus {
    return new PurchaseReconciliationStatus(9);
  }
  static from(value: number): PurchaseReconciliationStatus {
    const validStatuses: PurchaseReconciliationStatusValue[] = [1, 2, 3, 4, 9];
    if (!validStatuses.includes(value as PurchaseReconciliationStatusValue)) {
      throw new DomainError(`无效的采购对账单状态: ${value}`);
    }
    return new PurchaseReconciliationStatus(value as PurchaseReconciliationStatusValue);
  }

  private static transitions: Record<PurchaseReconciliationStatusValue, PurchaseReconciliationStatusValue[]> = {
    1: [2],
    2: [3, 4],
    3: [4],
    4: [9],
    9: [],
  };

  canTransitionTo(target: PurchaseReconciliationStatusValue): boolean {
    return PurchaseReconciliationStatus.transitions[this.value].includes(target);
  }

  transitionTo(target: PurchaseReconciliationStatusValue): PurchaseReconciliationStatus {
    if (!this.canTransitionTo(target)) {
      throw new DomainError(
        `非法状态流转: ${STATUS_LABELS[this.value]} -> ${STATUS_LABELS[target]}`
      );
    }
    return new PurchaseReconciliationStatus(target);
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

  equals(other: PurchaseReconciliationStatus): boolean {
    return this.value === other.value;
  }
}
