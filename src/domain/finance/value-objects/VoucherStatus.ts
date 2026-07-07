import { DomainError } from '../../shared/DomainTypes';

// 凭证状态：0=草稿, 1=已提交, 2=已审核, 3=已记账, 4=已作废
export type VoucherStatusValue = 0 | 1 | 2 | 3 | 4;

export const VoucherStatusEnum = {
  DRAFT: 0,
  SUBMITTED: 1,
  AUDITED: 2,
  POSTED: 3,
  VOIDED: 4,
} as const;

const STATUS_LABELS: Record<number, string> = {
  0: '草稿',
  1: '已提交',
  2: '已审核',
  3: '已记账',
  4: '已作废',
};

export class VoucherStatus {
  private constructor(public readonly value: VoucherStatusValue) {}

  static draft(): VoucherStatus {
    return new VoucherStatus(0);
  }
  static submitted(): VoucherStatus {
    return new VoucherStatus(1);
  }
  static audited(): VoucherStatus {
    return new VoucherStatus(2);
  }
  static posted(): VoucherStatus {
    return new VoucherStatus(3);
  }
  static voided(): VoucherStatus {
    return new VoucherStatus(4);
  }
  static from(value: number): VoucherStatus {
    const validStatuses: VoucherStatusValue[] = [0, 1, 2, 3, 4];
    if (!validStatuses.includes(value as VoucherStatusValue)) {
      throw new DomainError(`无效的凭证状态: ${value}`);
    }
    return new VoucherStatus(value as VoucherStatusValue);
  }

  private static transitions: Record<VoucherStatusValue, VoucherStatusValue[]> = {
    0: [1, 4],
    1: [2, 0, 4],
    2: [3, 4],
    3: [],
    4: [],
  };

  canTransitionTo(target: VoucherStatusValue): boolean {
    return VoucherStatus.transitions[this.value].includes(target);
  }

  transitionTo(target: VoucherStatusValue): VoucherStatus {
    if (!this.canTransitionTo(target)) {
      throw new DomainError(
        `非法状态流转: ${STATUS_LABELS[this.value]} -> ${STATUS_LABELS[target]}`
      );
    }
    return new VoucherStatus(target);
  }

  isPosted(): boolean {
    return this.value === 3;
  }

  isTerminal(): boolean {
    return this.value === 3 || this.value === 4;
  }

  canEdit(): boolean {
    return this.value === 0;
  }

  canDelete(): boolean {
    return this.value === 0;
  }

  get label(): string {
    return STATUS_LABELS[this.value] || String(this.value);
  }

  equals(other: VoucherStatus): boolean {
    return this.value === other.value;
  }
}
