import { describe, it, expect } from 'vitest';
import { Money } from '@/domain/shared/value-objects/Money';

describe('Money 值对象测试', () => {
  it('应正确创建金额', () => {
    const money = Money.create(100.505);
    expect(money.amount).toBe(100.51);
  });

  it('零金额', () => {
    const money = Money.zero();
    expect(money.amount).toBe(0);
    expect(money.isZero()).toBe(true);
  });

  it('金额相加', () => {
    const a = Money.create(100.5);
    const b = Money.create(50.3);
    const result = a.add(b);
    expect(result.amount).toBe(150.8);
  });

  it('金额相减', () => {
    const a = Money.create(100.5);
    const b = Money.create(50.3);
    const result = a.subtract(b);
    expect(result.amount).toBe(50.2);
  });

  it('金额相减结果为负数应抛出异常', () => {
    const a = Money.create(50);
    const b = Money.create(100);
    expect(() => a.subtract(b)).toThrow('金额相减结果不能为负数');
  });

  it('金额乘法', () => {
    const money = Money.create(100);
    const result = money.multiply(2.5);
    expect(result.amount).toBe(250);
  });

  it('负数金额应抛出异常', () => {
    expect(() => Money.create(-10)).toThrow('金额不能为负数');
  });

  it('不同币种不能相加', () => {
    const a = Money.create(100, 'CNY');
    const b = Money.create(50, 'USD');
    expect(() => a.add(b)).toThrow('币种不一致');
  });

  it('不同币种不能相减', () => {
    const a = Money.create(100, 'CNY');
    const b = Money.create(50, 'USD');
    expect(() => a.subtract(b)).toThrow('币种不一致');
  });

  it('浮点精度处理', () => {
    const a = Money.create(0.1);
    const b = Money.create(0.2);
    const result = a.add(b);
    expect(result.amount).toBe(0.3);
  });
});
