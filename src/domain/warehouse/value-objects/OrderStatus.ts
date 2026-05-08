import { DomainError } from '../../shared/DomainTypes';

export type InboundStatus = 'draft' | 'pending' | 'completed' | 'cancelled';

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
  static from(value: string): OrderStatus {
    const validStatuses: InboundStatus[] = ['draft', 'pending', 'completed', 'cancelled'];
    if (!validStatuses.includes(value as InboundStatus)) {
      throw new DomainError(`无效的入库单状态: ${value}`);
    }
    return new OrderStatus(value as InboundStatus);
  }

  private static transitions: Record<InboundStatus, InboundStatus[]> = {
    draft: ['pending', 'cancelled'],
    pending: ['completed', 'cancelled'],
    completed: ['pending'],
    cancelled: [],
  };

  private static operations: Record<InboundStatus, string[]> = {
    draft: ['edit', 'delete', 'submit'],
    pending: ['audit', 'cancel', 'view'],
    completed: ['unaudit', 'view'],
    cancelled: ['view'],
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
