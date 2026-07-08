import { DomainError } from '../../shared/DomainTypes';

export type UnqualifiedStatusValue = 'pending' | 'handling' | 'completed';

export class UnqualifiedStatus {
  private constructor(public readonly value: UnqualifiedStatusValue) {}

  static pending(): UnqualifiedStatus {
    return new UnqualifiedStatus('pending');
  }
  static handling(): UnqualifiedStatus {
    return new UnqualifiedStatus('handling');
  }
  static completed(): UnqualifiedStatus {
    return new UnqualifiedStatus('completed');
  }

  static from(value: string): UnqualifiedStatus {
    const validStatuses: UnqualifiedStatusValue[] = ['pending', 'handling', 'completed'];
    if (!validStatuses.includes(value as UnqualifiedStatusValue)) {
      throw new DomainError(`无效的不合格品状态: ${value}`);
    }
    return new UnqualifiedStatus(value as UnqualifiedStatusValue);
  }

  static fromDbCode(code: number): UnqualifiedStatus {
    const map: Record<number, UnqualifiedStatusValue> = {
      1: 'pending',
      2: 'handling',
      3: 'completed',
    };
    const status = map[code];
    if (!status) {
      throw new DomainError(`无效的不合格品状态码: ${code}`);
    }
    return new UnqualifiedStatus(status);
  }

  toDbCode(): number {
    const map: Record<UnqualifiedStatusValue, number> = {
      pending: 1,
      handling: 2,
      completed: 3,
    };
    return map[this.value];
  }

  private static transitions: Record<UnqualifiedStatusValue, UnqualifiedStatusValue[]> = {
    pending: ['handling'],
    handling: ['completed'],
    completed: [],
  };

  private static operations: Record<UnqualifiedStatusValue, string[]> = {
    pending: ['edit', 'delete', 'start_handle'],
    handling: ['complete_handle', 'edit'],
    completed: ['view'],
  };

  canTransitionTo(target: UnqualifiedStatusValue): boolean {
    return UnqualifiedStatus.transitions[this.value].includes(target);
  }

  transitionTo(target: UnqualifiedStatusValue): UnqualifiedStatus {
    if (!this.canTransitionTo(target)) {
      throw new DomainError(
        `不合格品状态流转不合法: ${this.label()} -> ${UnqualifiedStatus.from(target).label()}`
      );
    }
    return new UnqualifiedStatus(target);
  }

  canStartHandle(): boolean {
    return UnqualifiedStatus.operations[this.value].includes('start_handle');
  }

  canComplete(): boolean {
    return UnqualifiedStatus.operations[this.value].includes('complete_handle');
  }

  canEdit(): boolean {
    return UnqualifiedStatus.operations[this.value].includes('edit');
  }

  canDelete(): boolean {
    return UnqualifiedStatus.operations[this.value].includes('delete');
  }

  label(): string {
    const labels: Record<UnqualifiedStatusValue, string> = {
      pending: '待处理',
      handling: '处理中',
      completed: '已完成',
    };
    return labels[this.value];
  }

  equals(other: UnqualifiedStatus): boolean {
    return this.value === other.value;
  }
}
