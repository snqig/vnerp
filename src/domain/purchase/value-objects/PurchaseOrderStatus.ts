import { t } from '@/lib/server-translate';

import { DomainError } from '../../shared/DomainTypes';

export type PurchaseStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'partially_received'
  | 'completed'
  | 'closed'
  | 'voided';

export class PurchaseOrderStatus {
  private constructor(public readonly value: PurchaseStatus) {}

  static draft(): PurchaseOrderStatus {
    return new PurchaseOrderStatus('draft');
  }
  static submitted(): PurchaseOrderStatus {
    return new PurchaseOrderStatus('submitted');
  }
  static approved(): PurchaseOrderStatus {
    return new PurchaseOrderStatus('approved');
  }
  static partiallyReceived(): PurchaseOrderStatus {
    return new PurchaseOrderStatus('partially_received');
  }
  static completed(): PurchaseOrderStatus {
    return new PurchaseOrderStatus('completed');
  }
  static closed(): PurchaseOrderStatus {
    return new PurchaseOrderStatus('closed');
  }
  static voided(): PurchaseOrderStatus {
    return new PurchaseOrderStatus('voided');
  }

  static from(value: string): PurchaseOrderStatus {
    const validStatuses: PurchaseStatus[] = [
      'draft',
      'submitted',
      'approved',
      'partially_received',
      'completed',
      'closed',
      'voided',
    ];
    if (!validStatuses.includes(value as PurchaseStatus)) {
      throw new DomainError(`无效的采购单状态: ${value}`);
    }
    return new PurchaseOrderStatus(value as PurchaseStatus);
  }

  static fromDbCode(code: number): PurchaseOrderStatus {
    const map: Record<number, PurchaseStatus> = {
      10: 'draft',
      20: 'submitted',
      30: 'approved',
      40: 'partially_received',
      50: 'completed',
      90: 'closed',
      99: 'voided',
    };
    const status = map[code];
    if (!status) {
      throw new DomainError(`无效的采购单状态码: ${code}`);
    }
    return new PurchaseOrderStatus(status);
  }

  toDbCode(): number {
    const map: Record<PurchaseStatus, number> = {
      draft: 10,
      submitted: 20,
      approved: 30,
      partially_received: 40,
      completed: 50,
      closed: 90,
      voided: 99,
    };
    return map[this.value];
  }

  private static transitions: Record<PurchaseStatus, PurchaseStatus[]> = {
    draft: ['submitted', 'closed', 'voided'],
    submitted: ['approved', 'closed', 'voided'],
    approved: ['partially_received', 'completed', 'closed', 'voided'],
    // 回退转换（completed/partially_received → approved 等）：仅由 reverseReceive 内部重算状态使用，其他流程禁止直接 transitionTo 回退
    partially_received: ['approved', 'completed', 'closed', 'voided'],
    completed: ['partially_received', 'approved', 'closed'],
    closed: [],
    voided: [],
  };

  private static operations: Record<PurchaseStatus, string[]> = {
    draft: ['edit', 'delete', 'submit', 'void'],
    submitted: ['approve', 'close', 'void'],
    approved: ['receive', 'close', 'void'],
    partially_received: ['receive', 'reverse_receive', 'close', 'void'],
    completed: ['view', 'reverse_receive', 'close'],
    closed: ['view'],
    voided: ['view'],
  };

  canTransitionTo(target: PurchaseStatus): boolean {
    return PurchaseOrderStatus.transitions[this.value].includes(target);
  }

  transitionTo(target: PurchaseStatus): PurchaseOrderStatus {
    if (!this.canTransitionTo(target)) {
      throw new DomainError(
        `采购单状态流转不合法: ${this.label()} -> ${PurchaseOrderStatus.from(target).label()}`
      );
    }
    return new PurchaseOrderStatus(target);
  }

  canEdit(): boolean {
    return PurchaseOrderStatus.operations[this.value].includes('edit');
  }

  canDelete(): boolean {
    return PurchaseOrderStatus.operations[this.value].includes('delete');
  }

  canApprove(): boolean {
    return PurchaseOrderStatus.operations[this.value].includes('approve');
  }

  canReceive(): boolean {
    return PurchaseOrderStatus.operations[this.value].includes('receive');
  }

  canReverseReceive(): boolean {
    return PurchaseOrderStatus.operations[this.value].includes('reverse_receive');
  }

  canVoid(): boolean {
    return PurchaseOrderStatus.operations[this.value].includes('void');
  }

  label(): string {
  const ts = t;
    const labels: Record<PurchaseStatus, string> = {
      draft: ts('k_oc54qp'),
      submitted: ts('k_168pm1t'),
      approved: ts('k_7j2xv0'),
      partially_received: ts('k_lrszo3'),
      completed: ts('k_19j4h'),
      closed: ts('k_q0bjhp'),
      voided: ts('k_1o0kows'),
    };
    return labels[this.value];
  }

  equals(other: PurchaseOrderStatus): boolean {
    return this.value === other.value;
  }
}
