import { describe, it, expect } from 'vitest';
import { Money } from '@/domain/shared/value-objects/Money';
import { DomainError } from '@/domain/shared/DomainTypes';

/**
 * 8.3 Money 值对象专项测试
 *
 * 覆盖目标：
 * 1. 构造校验（负数抛错）
 * 2. zero() / create() 工厂
 * 3. add/subtract/multiply 运算（含币种一致性校验）
 * 4. isZero/isPositive 判断
 * 5. 四舍五入精度
 */
describe('8.3 Money 值对象', () => {
  describe('create() 工厂', () => {
    it('合法金额创建成功（默认 CNY）', () => {
      const m = Money.create(100);
      expect(m.amount).toBe(100);
      expect(m.currency).toBe('CNY');
    });

    it('指定币种创建', () => {
      const m = Money.create(50, 'USD');
      expect(m.amount).toBe(50);
      expect(m.currency).toBe('USD');
    });

    it('金额四舍五入到 2 位小数', () => {
      expect(Money.create(10.005).amount).toBe(10.01);
      expect(Money.create(10.004).amount).toBe(10);
      expect(Money.create(33.333).amount).toBe(33.33);
    });

    it('负数金额抛 DomainError', () => {
      expect(() => Money.create(-1)).toThrow(DomainError);
      expect(() => Money.create(-0.01)).toThrow(/金额不能为负数/);
    });
  });

  describe('zero() 工厂', () => {
    it('zero() 金额为 0，币种为 CNY', () => {
      const m = Money.zero();
      expect(m.amount).toBe(0);
      expect(m.currency).toBe('CNY');
      expect(m.isZero()).toBe(true);
    });
  });

  describe('add() 加法', () => {
    it('同币种相加', () => {
      expect(Money.create(10).add(Money.create(20)).amount).toBe(30);
    });

    it('相加结果四舍五入', () => {
      // 0.1 + 0.2 = 0.30000000000000004，应四舍五入到 0.3
      expect(Money.create(0.1).add(Money.create(0.2)).amount).toBe(0.3);
    });

    it('异币种相加抛 DomainError', () => {
      expect(() => Money.create(10, 'CNY').add(Money.create(10, 'USD'))).toThrow(DomainError);
      expect(() => Money.create(10, 'CNY').add(Money.create(10, 'USD'))).toThrow(/币种不一致/);
    });
  });

  describe('subtract() 减法', () => {
    it('同币种相减', () => {
      expect(Money.create(30).subtract(Money.create(10)).amount).toBe(20);
    });

    it('相减结果四舍五入', () => {
      expect(Money.create(0.3).subtract(Money.create(0.1)).amount).toBe(0.2);
    });

    it('异币种相减抛 DomainError', () => {
      expect(() => Money.create(10, 'CNY').subtract(Money.create(5, 'USD'))).toThrow(DomainError);
    });

    it('相减结果为负数抛 DomainError', () => {
      expect(() => Money.create(10).subtract(Money.create(20))).toThrow(DomainError);
      expect(() => Money.create(10).subtract(Money.create(20))).toThrow(/金额相减结果不能为负数/);
    });

    it('相减结果为 0 合法', () => {
      expect(Money.create(10).subtract(Money.create(10)).amount).toBe(0);
    });
  });

  describe('multiply() 乘法', () => {
    it('金额乘以系数', () => {
      expect(Money.create(10).multiply(3).amount).toBe(30);
      expect(Money.create(100).multiply(0.5).amount).toBe(50);
    });

    it('乘法结果四舍五入', () => {
      expect(Money.create(10).multiply(0.333).amount).toBe(3.33);
    });

    it('乘以 0 结果为 0', () => {
      expect(Money.create(100).multiply(0).amount).toBe(0);
    });
  });

  describe('判断方法', () => {
    it('isZero 判断', () => {
      expect(Money.zero().isZero()).toBe(true);
      expect(Money.create(0).isZero()).toBe(true);
      expect(Money.create(0.01).isZero()).toBe(false);
    });

    it('isPositive 判断', () => {
      expect(Money.create(0.01).isPositive()).toBe(true);
      expect(Money.create(100).isPositive()).toBe(true);
      expect(Money.zero().isPositive()).toBe(false);
    });
  });

  describe('精度边界', () => {
    it('大额整数运算正确', () => {
      const big = Money.create(1000000);
      expect(big.multiply(100).amount).toBe(100000000);
    });

    it('小数 6 位精度收敛到 2 位', () => {
      expect(Money.create(1.234567).amount).toBe(1.23);
      expect(Money.create(99.999).amount).toBe(100);
    });
  });
});
