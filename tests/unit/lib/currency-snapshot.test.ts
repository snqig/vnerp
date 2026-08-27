import { describe, it, expect } from 'vitest';
import { CurrencySnapshot } from '@/domain/shared/value-objects/CurrencySnapshot';
import { Money } from '@/domain/shared/value-objects/Money';

/**
 * 多币种金额换算单元测试（对应文档 UT-IN-010 数学断言）
 * baseTotalAmount = totalAmount × exchangeRate，使用 Money 保证精度。
 */
describe('多币种金额换算 (UT-IN-010)', () => {
  it('USD 金额按汇率 7.2 换算为本位币 CNY → 720', () => {
    const usd = Money.create(100, 'USD');
    const snap = CurrencySnapshot.create('USD', 7.2, 'CNY');
    const cny = snap.convert(usd);
    expect(cny.currency).toBe('CNY');
    expect(cny.amount).toBe(720);
  });

  it('同币种换算不改变金额', () => {
    const m = Money.create(100, 'CNY');
    const snap = CurrencySnapshot.create('CNY', 1, 'CNY');
    expect(snap.convert(m).amount).toBe(100);
  });

  it('小数精度：33.33 USD @ 7.2 → 239.98', () => {
    const m = Money.create(33.33, 'USD');
    const snap = CurrencySnapshot.create('USD', 7.2, 'CNY');
    expect(snap.convert(m).amount).toBe(239.98);
  });

  it('非法币种代码 / 非正汇率抛错', () => {
    expect(() => CurrencySnapshot.create('US', 7.2, 'CNY')).toThrow();
    expect(() => CurrencySnapshot.create('USD', 0, 'CNY')).toThrow(/positive/i);
    expect(() => CurrencySnapshot.create('USD', 7.2, 'CN')).toThrow();
  });
});
