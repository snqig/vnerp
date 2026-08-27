import { DomainError } from '../../shared/DomainTypes';

// 采购退货单状态：1-待审核, 2-已审核, 3-已完成, 9-已取消
export type PurchaseReturnStatusValue = 1 | 2 | 3 | 9;

export const PurchaseReturnStatusEnum = {
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

export class PurchaseReturnStatus {
  private constructor(public readonly value: PurchaseReturnStatusValue) {}

  static pending(): PurchaseReturnStatus {
    return new PurchaseReturnStatus(1);
  }
  static approved(): PurchaseReturnStatus {
    return new PurchaseReturnStatus(2);
  }
  static completed(): PurchaseReturnStatus {
    return new PurchaseReturnStatus(3);
  }
  static cancelled(): PurchaseReturnStatus {
    return new PurchaseReturnStatus(9);
  }
  static from(value: number): PurchaseReturnStatus {
    const validStatuses: PurchaseReturnStatusValue[] = [1, 2, 3, 9];
    if (!validStatuses.includes(value as PurchaseReturnStatusValue)) {
      throw new DomainError(`无效的采购退货单状态: ${value}`);
    }
    return new PurchaseReturnStatus(value as PurchaseReturnStatusValue);
  }

  private static transitions: Record<PurchaseReturnStatusValue, PurchaseReturnStatusValue[]> = {
    1: [2, 9],
    2: [3, 9],
    3: [],
    9: [],
  };

  canTransitionTo(target: PurchaseReturnStatusValue): boolean {
    return PurchaseReturnStatus.transitions[this.value].includes(target);
  }

  transitionTo(target: PurchaseReturnStatusValue): PurchaseReturnStatus {
    if (!this.canTransitionTo(target)) {
      throw new DomainError(
        `非法状态流转: ${STATUS_LABELS[this.value]} -> ${STATUS_LABELS[target]}`
      );
    }
    return new PurchaseReturnStatus(target);
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

  equals(other: PurchaseReturnStatus): boolean {
    return this.value === other.value;
  }
}
