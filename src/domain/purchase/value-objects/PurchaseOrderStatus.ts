import { DomainError } from '../../shared/DomainTypes';

export type PurchaseStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'partially_received'
  | 'completed'
  | 'closed';

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

  static from(value: string): PurchaseOrderStatus {
    const validStatuses: PurchaseStatus[] = [
      'draft', 'submitted', 'approved',
      'partially_received', 'completed', 'closed',
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
    };
    return map[this.value];
  }

  private static transitions: Record<PurchaseStatus, PurchaseStatus[]> = {
    draft: ['submitted', 'closed'],
    submitted: ['approved', 'closed'],
    approved: ['partially_received', 'closed'],
    partially_received: ['completed', 'closed'],
    completed: [],
    closed: [],
  };

  private static operations: Record<PurchaseStatus, string[]> = {
    draft: ['edit', 'delete', 'submit'],
    submitted: ['approve', 'close'],
    approved: ['receive', 'close'],
    partially_received: ['receive', 'close'],
    completed: ['view'],
    closed: ['view'],
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

  label(): string {
    const labels: Record<PurchaseStatus, string> = {
      draft: '草稿',
      submitted: '已提交',
      approved: '已审核',
      partially_received: '部分入库',
      completed: '已完成',
      closed: '已关闭',
    };
    return labels[this.value];
  }

  equals(other: PurchaseOrderStatus): boolean {
    return this.value === other.value;
  }
}
