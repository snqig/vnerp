import { describe, it, expect } from 'vitest';
import {
  cn,
  formatMoney,
  formatAmount,
  formatCurrency,
  formatPercent,
  formatDate,
  generateBatchNo,
  generateTransNo,
} from './utils';

describe('工具函数测试', () => {
  describe('cn - 样式合并', () => {
    it('应该合并基础样式', () => {
      const result = cn('text-red-500', 'bg-blue-500');
      expect(result).toContain('text-red-500');
      expect(result).toContain('bg-blue-500');
    });

    it('应该处理条件样式', () => {
      const isActive = true;
      const result = cn('base-class', isActive && 'active-class');
      expect(result).toContain('base-class');
      expect(result).toContain('active-class');
    });

    it('应该处理空值', () => {
      const result = cn('base-class', null, undefined, false);
      expect(result).toBe('base-class');
    });
  });

  describe('formatMoney - 格式化金额', () => {
    it('应该格式化数字金额并加 ¥ 前缀与千分位', () => {
      expect(formatMoney(1234.56)).toBe('¥1,234.56');
    });

    it('应该格式化字符串金额', () => {
      expect(formatMoney('1234.56')).toBe('¥1,234.56');
    });

    it('null/undefined/空串应返回 ¥0.00', () => {
      expect(formatMoney(null)).toBe('¥0.00');
      expect(formatMoney(undefined)).toBe('¥0.00');
      expect(formatMoney('')).toBe('¥0.00');
    });

    it('NaN 应返回 ¥0.00', () => {
      expect(formatMoney('invalid')).toBe('¥0.00');
    });

    it('应该支持自定义小数位', () => {
      expect(formatMoney(1234.5, 3)).toBe('¥1,234.500');
    });
  });

  describe('formatAmount - formatMoney 别名', () => {
    it('应该与 formatMoney 行为一致', () => {
      expect(formatAmount(1234.56)).toBe('¥1,234.56');
      expect(formatAmount(null)).toBe('¥0.00');
    });
  });

  describe('formatCurrency - 自定义货币', () => {
    it('默认货币符号为 ¥', () => {
      expect(formatCurrency(1234.56)).toBe('¥1,234.56');
    });

    it('应该使用自定义货币符号', () => {
      expect(formatCurrency(1234.56, '$')).toBe('$1,234.56');
    });

    it('null 应返回 货币符号 + 0.00', () => {
      expect(formatCurrency(null, '$')).toBe('$0.00');
    });

    it('NaN 应返回 货币符号 + 0.00', () => {
      expect(formatCurrency('invalid', '$')).toBe('$0.00');
    });
  });

  describe('formatPercent - 格式化百分比', () => {
    it('应该把小数转为百分比', () => {
      expect(formatPercent(0.5)).toBe('50.00%');
    });

    it('null/undefined 应返回 0%', () => {
      expect(formatPercent(null)).toBe('0%');
      expect(formatPercent(undefined)).toBe('0%');
    });

    it('应该支持自定义小数位', () => {
      expect(formatPercent(0.123456, 1)).toBe('12.3%');
    });
  });

  describe('formatDate - 格式化日期', () => {
    it('应该格式化为 YYYY-MM-DD', () => {
      const date = new Date(2024, 2, 15);
      expect(formatDate(date, 'YYYY-MM-DD')).toBe('2024-03-15');
    });

    it('应该格式化为 YYYY-MM-DD HH:mm:ss', () => {
      const date = new Date(2024, 2, 15, 14, 30, 45);
      expect(formatDate(date, 'YYYY-MM-DD HH:mm:ss')).toBe('2024-03-15 14:30:45');
    });

    it('应该处理字符串日期', () => {
      // 不带 Z 的日期时间字符串按本地时区解析，避免时区偏差
      expect(formatDate('2024-03-15T10:00:00', 'YYYY-MM-DD')).toBe('2024-03-15');
    });

    it('默认格式应为 YYYY-MM-DD', () => {
      expect(formatDate(new Date(2024, 2, 15))).toBe('2024-03-15');
    });

    it('null/undefined 应返回空字符串', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
    });

    it('无效日期应返回空字符串', () => {
      expect(formatDate('invalid-date')).toBe('');
    });
  });

  describe('generateBatchNo - 生成批次号', () => {
    it('默认前缀 BAT 并包含 10 位日期随机串', () => {
      expect(generateBatchNo()).toMatch(/^BAT\d{10}$/);
    });

    it('应该使用传入前缀', () => {
      expect(generateBatchNo('WH01')).toMatch(/^WH01\d{10}$/);
    });
  });

  describe('generateTransNo - 生成交易号', () => {
    it('默认前缀 TRN 并包含 14 位时间随机串', () => {
      expect(generateTransNo()).toMatch(/^TRN\d{14}$/);
    });

    it('应该使用传入前缀', () => {
      expect(generateTransNo('OUT')).toMatch(/^OUT\d{14}$/);
    });
  });
});
