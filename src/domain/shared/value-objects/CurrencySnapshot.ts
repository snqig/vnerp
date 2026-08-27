import { Money } from './Money';

export class CurrencySnapshot {
  private constructor(
    public readonly currency: string,
    public readonly exchangeRate: number,
    public readonly baseCurrency: string
  ) {}

  static create(currency: string, exchangeRate: number, baseCurrency: string): CurrencySnapshot {
    if (!currency || currency.length !== 3) {
      throw new Error('Invalid currency code: must be 3 characters');
    }
    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      throw new Error('Exchange rate must be a positive finite number');
    }
    if (!baseCurrency || baseCurrency.length !== 3) {
      throw new Error('Invalid base currency code: must be 3 characters');
    }
    return new CurrencySnapshot(currency, exchangeRate, baseCurrency);
  }

  get isSameCurrency(): boolean {
    return this.currency === this.baseCurrency;
  }

  convert(money: Money, decimalPlaces: number = 2): Money {
    return money.convertTo(this.exchangeRate, this.baseCurrency, decimalPlaces);
  }
}
