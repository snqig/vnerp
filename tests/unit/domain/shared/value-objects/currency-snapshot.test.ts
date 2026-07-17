import { describe, it, expect } from 'vitest';
import { CurrencySnapshot } from '@/domain/shared/value-objects/CurrencySnapshot';
import { Money } from '@/domain/shared/value-objects/Money';

describe('CurrencySnapshot', () => {
  describe('create', () => {
    it('should create a valid CurrencySnapshot', () => {
      const snapshot = CurrencySnapshot.create('USD', 7.25, 'CNY');
      expect(snapshot.currency).toBe('USD');
      expect(snapshot.exchangeRate).toBe(7.25);
      expect(snapshot.baseCurrency).toBe('CNY');
    });

    it('should reject invalid currency code (not 3 chars)', () => {
      expect(() => CurrencySnapshot.create('US', 7.25, 'CNY')).toThrow();
      expect(() => CurrencySnapshot.create('USDD', 7.25, 'CNY')).toThrow();
      expect(() => CurrencySnapshot.create('', 7.25, 'CNY')).toThrow();
    });

    it('should reject invalid exchangeRate (<=0 or NaN)', () => {
      expect(() => CurrencySnapshot.create('USD', 0, 'CNY')).toThrow();
      expect(() => CurrencySnapshot.create('USD', -1, 'CNY')).toThrow();
      expect(() => CurrencySnapshot.create('USD', NaN, 'CNY')).toThrow();
    });

    it('should reject invalid baseCurrency', () => {
      expect(() => CurrencySnapshot.create('USD', 7.25, 'CN')).toThrow();
      expect(() => CurrencySnapshot.create('USD', 7.25, '')).toThrow();
    });
  });

  describe('isSameCurrency', () => {
    it('should return true when same currency', () => {
      const snapshot = CurrencySnapshot.create('CNY', 1, 'CNY');
      expect(snapshot.isSameCurrency).toBe(true);
    });

    it('should return false when different currency', () => {
      const snapshot = CurrencySnapshot.create('USD', 7.25, 'CNY');
      expect(snapshot.isSameCurrency).toBe(false);
    });
  });

  describe('convert', () => {
    it('should short-circuit return same amount for same currency', () => {
      const snapshot = CurrencySnapshot.create('CNY', 1, 'CNY');
      const money = new Money(100, 'CNY');
      const result = snapshot.convert(money);
      expect(result.amount).toBe(100);
      expect(result.currency).toBe('CNY');
    });

    it('should convert by the locked exchange rate for cross-currency', () => {
      const snapshot = CurrencySnapshot.create('USD', 7.25, 'CNY');
      const money = new Money(100, 'USD');
      const result = snapshot.convert(money);
      expect(result.amount).toBe(725);
      expect(result.currency).toBe('CNY');
    });

    it('should convert VND with 0 decimal places', () => {
      const snapshot = CurrencySnapshot.create('VND', 0.0003, 'CNY');
      const money = new Money(1000000, 'VND');
      const result = snapshot.convert(money, 0);
      expect(result.amount).toBe(300);
      expect(result.currency).toBe('CNY');
    });

    it('should throw for negative amounts', () => {
      const snapshot = CurrencySnapshot.create('USD', 7.25, 'CNY');
      expect(() => snapshot.convert(new Money(-100, 'USD'))).toThrow();
    });
  });
});
