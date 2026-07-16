// src/domain/shared/CurrencyService.ts

/**
 * 币种信息
 */
export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
}

/**
 * 汇率记录
 */
export interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  rateDate: Date;
}

/**
 * 币种与汇率领域服务接口
 * 实现由基础设施层提供
 */
export interface ICurrencyService {
  /** 获取币种信息（含小数位） */
  getCurrency(code: string): Promise<CurrencyInfo | null>;

  /** 获取最新汇率（from→to），无则返回 null */
  getLatestRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | null>;

  /** 获取指定日期汇率 */
  getRateOnDate(fromCurrency: string, toCurrency: string, date: Date): Promise<ExchangeRate | null>;

  /** 获取所有启用的币种 */
  listActiveCurrencies(): Promise<CurrencyInfo[]>;
}
