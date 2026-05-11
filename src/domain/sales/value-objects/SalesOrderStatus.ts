import { DomainError } from '../../shared/DomainTypes';

export type SalesStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'partially_shipped'
  | 'completed'
  | 'closed';

export class SalesOrderStatus {
  private constructor(public readonly value: SalesStatus) {}

  static draft(): SalesOrderStatus { return new SalesOrderStatus('draft'); }
  static submitted(): SalesOrderStatus { return new SalesOrderStatus('submitted'); }
  static approved(): SalesOrderStatus { return new SalesOrderStatus('approved'); }
  static partiallyShipped(): SalesOrderStatus { return new SalesOrderStatus('partially_shipped'); }
  static completed(): SalesOrderStatus { return new SalesOrderStatus('completed'); }
  static closed(): SalesOrderStatus { return new SalesOrderStatus('closed'); }

  static from(value: string): SalesOrderStatus {
    const validStatuses: SalesStatus[] = [
      'draft', 'submitted', 'approved',
      'partially_shipped', 'completed', 'closed',
    ];
    if (!validStatuses.includes(value as SalesStatus)) {
      throw new DomainError(`无效的销售单状态: ${value}`);
    }
    return new SalesOrderStatus(value as SalesStatus);
  }

  static fromDbCode(code: number): SalesOrderStatus {
    const map: Record<number, SalesStatus> = {
      0: 'draft', 1: 'submitted', 2: 'approved',
      3: 'partially_shipped', 4: 'completed', 9: 'closed',
    };
    const status = map[code];
    if (!status) throw new DomainError(`无效的销售单状态码: ${code}`);
    return new SalesOrderStatus(status);
  }

  toDbCode(): number {
    const map: Record<SalesStatus, number> = {
      draft: 0, submitted: 1, approved: 2,
      partially_shipped: 3, completed: 4, closed: 9,
    };
    return map[this.value];
  }

  private static transitions: Record<SalesStatus, SalesStatus[]> = {
    draft: ['submitted', 'closed'],
    submitted: ['approved', 'closed'],
    approved: ['partially_shipped', 'closed'],
    partially_shipped: ['completed', 'closed'],
    completed: [],
    closed: [],
  };

  private static operations: Record<SalesStatus, string[]> = {
    draft: ['edit', 'delete', 'submit'],
    submitted: ['approve', 'close'],
    approved: ['ship', 'close'],
    partially_shipped: ['ship', 'close'],
    completed: ['view'],
    closed: ['view'],
  };

  canTransitionTo(target: SalesStatus): boolean {
    return SalesOrderStatus.transitions[this.value].includes(target);
  }

  transitionTo(target: SalesStatus): SalesOrderStatus {
    if (!this.canTransitionTo(target)) {
      throw new DomainError(`销售单状态流转不合法: ${this.label()} -> ${SalesOrderStatus.from(target).label()}`);
    }
    return new SalesOrderStatus(target);
  }

  canEdit(): boolean { return SalesOrderStatus.operations[this.value].includes('edit'); }
  canDelete(): boolean { return SalesOrderStatus.operations[this.value].includes('delete'); }
  canApprove(): boolean { return SalesOrderStatus.operations[this.value].includes('approve'); }
  canShip(): boolean { return SalesOrderStatus.operations[this.value].includes('ship'); }

  label(): string {
    const labels: Record<SalesStatus, string> = {
      draft: '草稿', submitted: '已提交', approved: '已审核',
      partially_shipped: '部分出库', completed: '已完成', closed: '已关闭',
    };
    return labels[this.value];
  }

  equals(other: SalesOrderStatus): boolean { return this.value === other.value; }
}
