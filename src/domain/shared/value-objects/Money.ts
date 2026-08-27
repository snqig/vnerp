import { DomainError } from '../../shared/DomainTypes';

export class Money {
  private constructor(
    public readonly amount: number,
    public readonly currency: string = 'CNY',
    allowNegative = false
  ) {
    if (amount < 0 && !allowNegative) {
      throw new DomainError('金额不能为负数');
    }
  }

  static zero(): Money {
    return new Money(0);
  }

  static create(amount: number, currency: string = 'CNY'): Money {
    return new Money(Math.round(amount * 100) / 100, currency);
  }

  /**
   * 创建红字金额（允许负数），用于退货冲销等红字核算场景。
   * T305: 销售退货红字应收单需要负数金额冲减客户应收余额。
   */
  static redLetter(amount: number, currency: string = 'CNY'): Money {
    return new Money(Math.round(amount * 100) / 100, currency, true);
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

  /**
   * 按汇率转换为目标币种（返回新的 Money 对象）
   * @param rate 汇率（from→to）
   * @param targetCurrency 目标币种代码
   * @param decimalPlaces 目标币种小数位（VND=0, CNY/USD=2）
   * 注意：本方法不支持 redLetter 创建的负数金额；如需负数转换，使用场景出现后再行扩展。
   */
  convertTo(rate: number, targetCurrency: string, decimalPlaces: number = 2): Money {
    if (this.currency === targetCurrency) {
      return new Money(this.amount, this.currency);
    }
    const converted = this.amount * rate;
    const factor = Math.pow(10, decimalPlaces);
    const rounded = Math.round(converted * factor) / factor;
    return new Money(rounded, targetCurrency);
  }

  /**
   * 按指定小数位格式化金额为字符串
   */
  format(decimalPlaces: number = 2): string {
    return this.amount.toFixed(decimalPlaces);
  }
}
