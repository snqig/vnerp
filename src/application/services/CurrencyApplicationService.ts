import type { ICurrencyService } from '@/domain/shared/CurrencyService';
import { Money } from '@/domain/shared/value-objects/Money';
import { NotFoundError } from '@/domain/shared/DomainTypes';
import { logger } from '@/lib/logger';

// 内存缓存（无 Redis 时降级使用；多实例部署需替换为 Redis 实现）
const memoryCache = new Map<string, { value: number; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 分钟

export class CurrencyApplicationService {
  constructor(private currencyService: ICurrencyService) {}

  /**
   * 获取最新汇率，带缓存（TTL 5分钟）
   * 无 Redis 时降级为内存缓存
   */
  async getLatestRate(from: string, to: string): Promise<number> {
    if (from === to) return 1;

    const cacheKey = `rate:${from}:${to}`;
    const cached = memoryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const rate = await this.currencyService.getLatestRate(from, to);
    if (!rate) {
      throw new NotFoundError(`汇率未配置: ${from}→${to}，请先在汇率管理中录入`);
    }

    memoryCache.set(cacheKey, { value: rate.rate, expiresAt: Date.now() + CACHE_TTL_MS });
    return rate.rate;
  }

  /**
   * 换算金额为本位币
   */
  async convertToBaseCurrency(money: Money, baseCurrency: string): Promise<Money> {
    if (money.currency === baseCurrency) return money;

    const rate = await this.getLatestRate(money.currency, baseCurrency);
    const target = await this.currencyService.getCurrency(baseCurrency);
    if (!target) {
      throw new NotFoundError(`本位币 ${baseCurrency} 未配置`);
    }
    const decimalPlaces = target.decimalPlaces;

    logger.info({ module: 'Currency', action: 'convertToBaseCurrency' }, '汇率换算', {
      from: money.currency,
      to: baseCurrency,
      rate,
      amount: money.amount,
    });

    return money.convertTo(rate, baseCurrency, decimalPlaces);
  }

  /**
   * 清除汇率缓存（录入新汇率后调用）
   */
  clearCache(): void {
    memoryCache.clear();
  }
}

/**
 * 清除汇率缓存（供 API 路由在录入/删除汇率后调用）
 */
export function clearExchangeRateCache(): void {
  memoryCache.clear();
}
