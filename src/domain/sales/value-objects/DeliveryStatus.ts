import { DomainError } from '../../shared/DomainTypes';

// 发货单状态：1-待发货, 2-已发货, 3-已签收, 9-已取消
export type DeliveryStatusValue = 1 | 2 | 3 | 9;

export const DeliveryStatusEnum = {
  PENDING: 1,
  SHIPPED: 2,
  SIGNED: 3,
  CANCELLED: 9,
} as const;

const STATUS_LABELS: Record<number, string> = {
  1: '待发货',
  2: '已发货',
  3: '已签收',
  9: '已取消',
};

export class DeliveryStatus {
  private constructor(public readonly value: DeliveryStatusValue) {}

  static pending(): DeliveryStatus {
    return new DeliveryStatus(1);
  }
  static shipped(): DeliveryStatus {
    return new DeliveryStatus(2);
  }
  static signed(): DeliveryStatus {
    return new DeliveryStatus(3);
  }
  static cancelled(): DeliveryStatus {
    return new DeliveryStatus(9);
  }
  static from(value: number): DeliveryStatus {
    const validStatuses: DeliveryStatusValue[] = [1, 2, 3, 9];
    if (!validStatuses.includes(value as DeliveryStatusValue)) {
      throw new DomainError(`无效的发货单状态: ${value}`);
    }
    return new DeliveryStatus(value as DeliveryStatusValue);
  }

  private static transitions: Record<DeliveryStatusValue, DeliveryStatusValue[]> = {
    1: [2, 9],
    2: [3, 9],
    3: [],
    9: [],
  };

  canTransitionTo(target: DeliveryStatusValue): boolean {
    return DeliveryStatus.transitions[this.value].includes(target);
  }

  transitionTo(target: DeliveryStatusValue): DeliveryStatus {
    if (!this.canTransitionTo(target)) {
      throw new DomainError(
        `非法状态流转: ${STATUS_LABELS[this.value]} -> ${STATUS_LABELS[target]}`
      );
    }
    return new DeliveryStatus(target);
  }

  canShip(): boolean {
    return this.value === 1;
  }

  canSign(): boolean {
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

  equals(other: DeliveryStatus): boolean {
    return this.value === other.value;
  }
}
