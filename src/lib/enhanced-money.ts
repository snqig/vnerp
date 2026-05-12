import Decimal from 'decimal.js';

Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -9,
  toExpPos: 21,
});

export enum RoundingMode {
  ROUND_HALF_UP = Decimal.ROUND_HALF_UP,
  ROUND_HALF_DOWN = Decimal.ROUND_HALF_DOWN,
  ROUND_HALF_EVEN = Decimal.ROUND_HALF_EVEN,
  ROUND_UP = Decimal.ROUND_UP,
  ROUND_DOWN = Decimal.ROUND_DOWN,
  ROUND_CEIL = Decimal.ROUND_CEIL,
  ROUND_FLOOR = Decimal.ROUND_FLOOR,
}

export interface MoneyProps {
  amount: number | string | Decimal;
  currency?: string;
}

export class Money {
  private readonly _amount: Decimal;
  public readonly currency: string;

  private constructor(amount: Decimal, currency: string) {
    this._amount = amount;
    this.currency = currency;
  }

  static create(amount: MoneyProps['amount'], currency: string = 'CNY'): Money {
    try {
      const decimal = new Decimal(amount);
      if (decimal.isNaN()) throw new Error('NaN');
      if (!decimal.isFinite()) throw new Error('Infinite');
      const rounded = decimal.toDecimalPlaces(2, RoundingMode.ROUND_HALF_UP);
      return new Money(rounded, currency);
    } catch {
      throw new Error(`Invalid money amount: ${amount}`);
    }
  }

  static zero(currency: string = 'CNY'): Money {
    return new Money(new Decimal(0), currency);
  }

  static fromFen(fen: number, currency: string = 'CNY'): Money {
    return new Money(new Decimal(fen).dividedBy(100), currency);
  }

  get amount(): Decimal {
    return this._amount;
  }

  toNumber(): number {
    return this._amount.toNumber();
  }

  toFen(): number {
    return this._amount.times(100).round().toNumber();
  }

  toString(decimals: number = 2): string {
    return this._amount.toFixed(decimals);
  }

  format(symbol: string = '¥'): string {
    return `${symbol}${this._amount.toFixed(2)}`;
  }

  isZero(): boolean {
    return this._amount.isZero();
  }

  isPositive(): boolean {
    return this._amount.greaterThan(0);
  }

  isNegative(): boolean {
    return this._amount.lessThan(0);
  }

  isEqualTo(other: Money): boolean {
    return this.currency === other.currency && this._amount.equals(other._amount);
  }

  isGreaterThan(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
    return this._amount.greaterThan(other._amount);
  }

  isLessThan(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
    return this._amount.lessThan(other._amount);
  }

  add(other: Money, rounding: RoundingMode = RoundingMode.ROUND_HALF_UP, decimals: number = 2): Money {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
    const result = this._amount.plus(other._amount).toDecimalPlaces(decimals, rounding);
    return new Money(result, this.currency);
  }

  subtract(other: Money, rounding: RoundingMode = RoundingMode.ROUND_HALF_UP, decimals: number = 2): Money {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
    const result = this._amount.minus(other._amount).toDecimalPlaces(decimals, rounding);
    if (result.lessThan(0)) {
      throw new Error('Money cannot be negative');
    }
    return new Money(result, this.currency);
  }

  multiply(
    multiplier: number | string | Decimal,
    rounding: RoundingMode = RoundingMode.ROUND_HALF_UP,
    decimals: number = 2
  ): Money {
    const result = this._amount.times(new Decimal(multiplier)).toDecimalPlaces(decimals, rounding);
    return new Money(result, this.currency);
  }

  divide(
    divisor: number | string | Decimal,
    rounding: RoundingMode = RoundingMode.ROUND_HALF_UP,
    decimals: number = 2
  ): Money {
    const divisorDecimal = new Decimal(divisor);
    if (divisorDecimal.isZero()) {
      throw new Error('Division by zero');
    }
    const result = this._amount.dividedBy(divisorDecimal).toDecimalPlaces(decimals, rounding);
    return new Money(result, this.currency);
  }

  allocate(ratios: number[]): Money[] {
    if (ratios.length === 0) return [];

    const total = ratios.reduce((sum, r) => sum + r, 0);
    if (total <= 0) {
      throw new Error('Invalid allocation ratios');
    }

    const remainder = this._amount;
    const results: Decimal[] = [];
    let remaining = remainder;

    for (let i = 0; i < ratios.length - 1; i++) {
      const share = remainder.times(ratios[i]).dividedBy(total).toDecimalPlaces(2, RoundingMode.ROUND_HALF_UP);
      results.push(share);
      remaining = remaining.minus(share);
    }
    results.push(remaining.toDecimalPlaces(2, RoundingMode.ROUND_HALF_UP));

    return results.map((d) => new Money(d, this.currency));
  }

  static sum(amounts: Money[], rounding: RoundingMode = RoundingMode.ROUND_HALF_UP): Money {
    if (amounts.length === 0) return Money.zero();

    const currency = amounts[0].currency;
    const total = amounts.reduce((sum, m) => {
      if (m.currency !== currency) {
        throw new Error(`Currency mismatch: ${currency} vs ${m.currency}`);
      }
      return sum.plus(m._amount);
    }, new Decimal(0));

    return new Money(total.toDecimalPlaces(2, rounding), currency);
  }
}

export function calculateTax(
  amount: Money,
  taxRate: number | string,
  rounding: RoundingMode = RoundingMode.ROUND_HALF_UP
): Money {
  const rate = new Decimal(taxRate);
  const taxAmount = amount.multiply(rate, rounding, 2);
  return taxAmount;
}

export function calculateTotalWithTax(
  amount: Money,
  taxRate: number | string,
  rounding: RoundingMode = RoundingMode.ROUND_HALF_UP
): Money {
  const tax = calculateTax(amount, taxRate, rounding);
  return amount.add(tax, rounding, 2);
}
