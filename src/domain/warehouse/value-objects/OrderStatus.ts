import { DomainError } from '../../shared/DomainTypes';

export type InboundStatus = 'draft' | 'pending' | 'completed' | 'cancelled' | 'rejected';

const DB_TO_DOMAIN_STATUS: Record<string, InboundStatus> = {
  draft: 'draft',
  pending: 'pending',
  approved: 'completed',
  completed: 'completed',
  cancelled: 'cancelled',
  rejected: 'rejected',
};

export class OrderStatus {
  private constructor(public readonly value: InboundStatus) {}

  static draft(): OrderStatus {
    return new OrderStatus('draft');
  }
  static pending(): OrderStatus {
    return new OrderStatus('pending');
  }
  static completed(): OrderStatus {
    return new OrderStatus('completed');
  }
  static cancelled(): OrderStatus {
    return new OrderStatus('cancelled');
  }
  static rejected(): OrderStatus {
    return new OrderStatus('rejected');
  }
  static from(value: string): OrderStatus {
    const mappedValue = DB_TO_DOMAIN_STATUS[value] || value as InboundStatus;
    const validStatuses: InboundStatus[] = ['draft', 'pending', 'completed', 'cancelled', 'rejected'];
    if (!validStatuses.includes(mappedValue)) {
      throw new DomainError(`无效的入库单状态: ${value}`);
    }
    return new OrderStatus(mappedValue);
  }

  private static transitions: Record<InboundStatus, InboundStatus[]> = {
    draft: ['pending', 'cancelled'],
    pending: ['completed', 'cancelled', 'rejected'],
    completed: ['pending'],
    cancelled: [],
    rejected: ['pending', 'cancelled'],
  };

  private static operations: Record<InboundStatus, string[]> = {
    draft: ['edit', 'delete', 'submit'],
    pending: ['audit', 'cancel', 'view'],
    completed: ['unaudit', 'view'],
    cancelled: ['view'],
    rejected: ['edit', 'delete', 'submit', 'audit', 'view'],
  };

  canTransitionTo(target: InboundStatus): boolean {
    return OrderStatus.transitions[this.value].includes(target);
  }

  transitionTo(target: InboundStatus): OrderStatus {
    if (!this.canTransitionTo(target)) {
      throw new DomainError(`非法状态流转: ${this.value} -> ${target}`);
    }
    return new OrderStatus(target);
  }

  canEdit(): boolean {
    return OrderStatus.operations[this.value].includes('edit');
  }

  canDelete(): boolean {
    return OrderStatus.operations[this.value].includes('delete');
  }

  equals(other: OrderStatus): boolean {
    return this.value === other.value;
  }
}
