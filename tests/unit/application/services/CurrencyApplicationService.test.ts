import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CurrencyApplicationService } from '@/application/services/CurrencyApplicationService';
import type { ICurrencyService } from '@/domain/shared/CurrencyService';
import { Money } from '@/domain/shared/value-objects/Money';

describe('CurrencyApplicationService', () => {
  let mockCurrencyService: ICurrencyService;
  let service: CurrencyApplicationService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrencyService = {
      getCurrency: vi.fn(),
      getLatestRate: vi.fn(),
      getRateOnDate: vi.fn(),
      listActiveCurrencies: vi.fn(),
    };
    service = new CurrencyApplicationService(mockCurrencyService);
  });

  describe('getLatestRate()', () => {
    it('同币种返回 1', async () => {
      const rate = await service.getLatestRate('CNY', 'CNY');
      expect(rate).toBe(1);
      expect(mockCurrencyService.getLatestRate).not.toHaveBeenCalled();
    });

    it('有缓存时返回缓存值', async () => {
      vi.mocked(mockCurrencyService.getLatestRate).mockResolvedValue({
        fromCurrency: 'USD',
        toCurrency: 'CNY',
        rate: 7.25,
        rateDate: new Date('2026-07-16'),
      });
      const rate1 = await service.getLatestRate('USD', 'CNY');
      const rate2 = await service.getLatestRate('USD', 'CNY');
      expect(rate1).toBe(7.25);
      expect(rate2).toBe(7.25);
      // 第二次应命中缓存，不再次查询 DB
      expect(mockCurrencyService.getLatestRate).toHaveBeenCalledTimes(1);
    });

    it('汇率未配置抛错', async () => {
      vi.mocked(mockCurrencyService.getLatestRate).mockResolvedValue(null);
      await expect(service.getLatestRate('EUR', 'VND')).rejects.toThrow(/汇率未配置/);
    });
  });

  describe('convertToBaseCurrency()', () => {
    it('同币种直接返回', async () => {
      const money = Money.create(100, 'CNY');
      const result = await service.convertToBaseCurrency(money, 'CNY');
      expect(result.amount).toBe(100);
      expect(result.currency).toBe('CNY');
    });

    it('USD 转 CNY 正确换算', async () => {
      vi.mocked(mockCurrencyService.getLatestRate).mockResolvedValue({
        fromCurrency: 'USD',
        toCurrency: 'CNY',
        rate: 7.25,
        rateDate: new Date(),
      });
      vi.mocked(mockCurrencyService.getCurrency).mockResolvedValue({
        code: 'CNY',
        name: '人民币',
        symbol: '¥',
        decimalPlaces: 2,
      });
      const usd = Money.create(1000, 'USD');
      const cny = await service.convertToBaseCurrency(usd, 'CNY');
      expect(cny.amount).toBe(7250);
      expect(cny.currency).toBe('CNY');
    });

    it('VND 转 CNY 零小数位', async () => {
      vi.mocked(mockCurrencyService.getLatestRate).mockResolvedValue({
        fromCurrency: 'VND',
        toCurrency: 'CNY',
        rate: 0.0003,
        rateDate: new Date(),
      });
      vi.mocked(mockCurrencyService.getCurrency).mockResolvedValue({
        code: 'CNY',
        name: '人民币',
        symbol: '¥',
        decimalPlaces: 2,
      });
      const vnd = Money.create(250000, 'VND');
      const cny = await service.convertToBaseCurrency(vnd, 'CNY');
      expect(cny.amount).toBe(75);
    });
  });
});
