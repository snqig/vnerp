import { DomainError } from '../../shared/DomainTypes';

// 调拨单状态：0-草稿, 1-待审批, 2-已出库, 3-已入库, 4-已取消
export type TransferStatusValue = 0 | 1 | 2 | 3 | 4;

export const TransferStatusEnum = {
  DRAFT: 0,
  PENDING: 1,
  SHIPPED: 2,
  RECEIVED: 3,
  CANCELLED: 4,
} as const;

const STATUS_LABELS: Record<number, string> = {
  0: '草稿',
  1: '待审批',
  2: '已出库',
  3: '已入库',
  4: '已取消',
};

export class TransferStatus {
  private constructor(public readonly value: TransferStatusValue) {}

  static draft(): TransferStatus {
    return new TransferStatus(0);
  }
  static pending(): TransferStatus {
    return new TransferStatus(1);
  }
  static shipped(): TransferStatus {
    return new TransferStatus(2);
  }
  static received(): TransferStatus {
    return new TransferStatus(3);
  }
  static cancelled(): TransferStatus {
    return new TransferStatus(4);
  }
  static from(value: number): TransferStatus {
    const validStatuses: TransferStatusValue[] = [0, 1, 2, 3, 4];
    if (!validStatuses.includes(value as TransferStatusValue)) {
      throw new DomainError(`无效的调拨单状态: ${value}`);
    }
    return new TransferStatus(value as TransferStatusValue);
  }

  private static transitions: Record<TransferStatusValue, TransferStatusValue[]> = {
    0: [1, 4], // draft → pending, cancelled
    1: [2, 4], // pending → shipped, cancelled
    2: [3, 4], // shipped → received, cancelled
    3: [], // received: terminal
    4: [], // cancelled: terminal
  };

  private static operations: Record<TransferStatusValue, string[]> = {
    0: ['edit', 'delete', 'submit'],
    1: ['approve', 'cancel', 'view'],
    2: ['receive', 'cancel', 'view'],
    3: ['view'],
    4: ['view'],
  };

  canTransitionTo(target: TransferStatusValue): boolean {
    return TransferStatus.transitions[this.value].includes(target);
  }

  transitionTo(target: TransferStatusValue): TransferStatus {
    if (!this.canTransitionTo(target)) {
      throw new DomainError(
        `非法状态流转: ${STATUS_LABELS[this.value]} -> ${STATUS_LABELS[target]}`
      );
    }
    return new TransferStatus(target);
  }

  canEdit(): boolean {
    return TransferStatus.operations[this.value].includes('edit');
  }

  canDelete(): boolean {
    return TransferStatus.operations[this.value].includes('delete');
  }

  get label(): string {
    return STATUS_LABELS[this.value] || String(this.value);
  }

  equals(other: TransferStatus): boolean {
    return this.value === other.value;
  }
}
