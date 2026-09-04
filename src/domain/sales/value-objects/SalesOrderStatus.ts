import { t } from '@/lib/server-translate';

import { DomainError } from '../../shared/DomainTypes';

export type SalesStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'partially_shipped'
  | 'completed'
  | 'closed'
  | 'voided';

export class SalesOrderStatus {
  private constructor(public readonly value: SalesStatus) {}

  static draft(): SalesOrderStatus {
    return new SalesOrderStatus('draft');
  }
  static submitted(): SalesOrderStatus {
    return new SalesOrderStatus('submitted');
  }
  static approved(): SalesOrderStatus {
    return new SalesOrderStatus('approved');
  }
  static partiallyShipped(): SalesOrderStatus {
    return new SalesOrderStatus('partially_shipped');
  }
  static completed(): SalesOrderStatus {
    return new SalesOrderStatus('completed');
  }
  static closed(): SalesOrderStatus {
    return new SalesOrderStatus('closed');
  }
  static voided(): SalesOrderStatus {
    return new SalesOrderStatus('voided');
  }

  static from(value: string): SalesOrderStatus {
    const validStatuses: SalesStatus[] = [
      'draft',
      'submitted',
      'approved',
      'partially_shipped',
      'completed',
      'closed',
      'voided',
    ];
    if (!validStatuses.includes(value as SalesStatus)) {
      throw new DomainError(`无效的销售单状态: ${value}`);
    }
    return new SalesOrderStatus(value as SalesStatus);
  }

  static fromDbCode(code: number): SalesOrderStatus {
    const map: Record<number, SalesStatus> = {
      0: 'draft',
      1: 'submitted',
      2: 'approved',
      3: 'partially_shipped',
      4: 'completed',
      6: 'voided',
      9: 'closed',
    };
    const status = map[code];
    if (!status) throw new DomainError(`无效的销售单状态码: ${code}`);
    return new SalesOrderStatus(status);
  }

  toDbCode(): number {
    const map: Record<SalesStatus, number> = {
      draft: 0,
      submitted: 1,
      approved: 2,
      partially_shipped: 3,
      completed: 4,
      voided: 6,
      closed: 9,
    };
    return map[this.value];
  }

  private static transitions: Record<SalesStatus, SalesStatus[]> = {
    draft: ['submitted', 'closed', 'voided'],
    submitted: ['approved', 'closed', 'voided'],
    approved: ['partially_shipped', 'completed', 'closed', 'voided'],
    partially_shipped: ['completed', 'closed', 'voided'],
    // 已完成可关闭（支持作废全链路回滚 T403）
    completed: ['closed'],
    closed: [],
    voided: [],
  };

  private static operations: Record<SalesStatus, string[]> = {
    draft: ['edit', 'delete', 'submit', 'void'],
    submitted: ['approve', 'close', 'void'],
    approved: ['ship', 'close', 'void'],
    partially_shipped: ['ship', 'close', 'void'],
    completed: ['view', 'close'],
    closed: ['view'],
    voided: ['view'],
  };

  canTransitionTo(target: SalesStatus): boolean {
    return SalesOrderStatus.transitions[this.value].includes(target);
  }

  transitionTo(target: SalesStatus): SalesOrderStatus {
    if (!this.canTransitionTo(target)) {
      throw new DomainError(
        `销售单状态流转不合法: ${this.label()} -> ${SalesOrderStatus.from(target).label()}`
      );
    }
    return new SalesOrderStatus(target);
  }

  canEdit(): boolean {
    return SalesOrderStatus.operations[this.value].includes('edit');
  }
  canDelete(): boolean {
    return SalesOrderStatus.operations[this.value].includes('delete');
  }
  canApprove(): boolean {
    return SalesOrderStatus.operations[this.value].includes('approve');
  }
  canShip(): boolean {
    return SalesOrderStatus.operations[this.value].includes('ship');
  }
  canVoid(): boolean {
    return SalesOrderStatus.operations[this.value].includes('void');
  }

  label(): string {
  const ts = t;
    const labels: Record<SalesStatus, string> = {
      draft: ts('k_oc54qp'),
      submitted: ts('k_168pm1t'),
      approved: ts('k_7j2xv0'),
      partially_shipped: ts('k_8lpqyg'),
      completed: ts('k_19j4h'),
      closed: ts('k_q0bjhp'),
      voided: ts('k_1o0kows'),
    };
    return labels[this.value];
  }

  equals(other: SalesOrderStatus): boolean {
    return this.value === other.value;
  }
}
