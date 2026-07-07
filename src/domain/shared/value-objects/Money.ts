import { DomainError } from '../../shared/DomainTypes';

export class Money {
  private constructor(
    public readonly amount: number,
    public readonly currency: string = 'CNY'
  ) {
    if (amount < 0) {
      throw new DomainError('金额不能为负数');
    }
  }

  static zero(): Money {
    return new Money(0);
  }

  static create(amount: number, currency: string = 'CNY'): Money {
    return new Money(Math.round(amount * 100) / 100, currency);
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new DomainError('币种不一致，无法相加');
    }
    return new Money(Math.round((this.amount + other.amount) * 100) / 100, this.currency);
  }

  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new DomainError('币种不一致，无法相减');
    }
    const result = Math.round((this.amount - other.amount) * 100) / 100;
    if (result < 0) {
      throw new DomainError('金额相减结果不能为负数');
    }
    return new Money(result, this.currency);
  }

  multiply(factor: number): Money {
    return new Money(Math.round(this.amount * factor * 100) / 100, this.currency);
  }

  isZero(): boolean {
    return this.amount === 0;
  }

  isPositive(): boolean {
    return this.amount > 0;
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
}
