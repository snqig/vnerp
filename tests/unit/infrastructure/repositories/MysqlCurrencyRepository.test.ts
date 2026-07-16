import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MysqlCurrencyRepository } from '@/infrastructure/repositories/MysqlCurrencyRepository';

// Mock db module
vi.mock('@/lib/db', () => ({
  queryOne: vi.fn(),
  query: vi.fn(),
}));

import { queryOne, query } from '@/lib/db';

describe('MysqlCurrencyRepository', () => {
  let repo: MysqlCurrencyRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new MysqlCurrencyRepository();
  });

  describe('getCurrency()', () => {
    it('返回存在的币种信息', async () => {
      vi.mocked(queryOne).mockResolvedValue({
        code: 'USD',
        name: '美元',
        symbol: '$',
        decimal_places: 2,
      });
      const result = await repo.getCurrency('USD');
      expect(result).toEqual({
        code: 'USD',
        name: '美元',
        symbol: '$',
        decimalPlaces: 2,
      });
    });

    it('币种不存在返回 null', async () => {
      vi.mocked(queryOne).mockResolvedValue(null);
      const result = await repo.getCurrency('EUR');
      expect(result).toBeNull();
    });
  });

  describe('getLatestRate()', () => {
    it('返回最新汇率记录', async () => {
      vi.mocked(queryOne).mockResolvedValue({
        from_currency: 'USD',
        to_currency: 'CNY',
        rate: '7.250000',
        rate_date: new Date('2026-07-16'),
      });
      const result = await repo.getLatestRate('USD', 'CNY');
      expect(result).toEqual({
        fromCurrency: 'USD',
        toCurrency: 'CNY',
        rate: 7.25,
        rateDate: new Date('2026-07-16'),
      });
    });

    it('汇率未配置返回 null', async () => {
      vi.mocked(queryOne).mockResolvedValue(null);
      const result = await repo.getLatestRate('EUR', 'VND');
      expect(result).toBeNull();
    });
  });

  describe('listActiveCurrencies()', () => {
    it('返回启用币种列表', async () => {
      vi.mocked(query).mockResolvedValue([
        { code: 'CNY', name: '人民币', symbol: '¥', decimal_places: 2 },
        { code: 'USD', name: '美元', symbol: '$', decimal_places: 2 },
      ]);
      const result = await repo.listActiveCurrencies();
      expect(result).toHaveLength(2);
      expect(result[0].code).toBe('CNY');
    });
  });
});
