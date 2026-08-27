import { queryOne, query } from '@/lib/db';
import type { ICurrencyService, CurrencyInfo, ExchangeRate } from '@/domain/shared/CurrencyService';

interface CurrencyRow {
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
}

interface ExchangeRateRow {
  from_currency: string;
  to_currency: string;
  rate: string;
  rate_date: Date;
}

export class MysqlCurrencyRepository implements ICurrencyService {
  async getCurrency(code: string): Promise<CurrencyInfo | null> {
    const row = await queryOne<CurrencyRow>(
      'SELECT code, name, symbol, decimal_places FROM sys_currency WHERE code = ? AND status = 1 AND deleted = 0',
      [code]
    );
    if (!row) return null;
    return {
      code: row.code,
      name: row.name,
      symbol: row.symbol,
      decimalPlaces: row.decimal_places,
    };
  }

  async getLatestRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | null> {
    const row = await queryOne<ExchangeRateRow>(
      'SELECT from_currency, to_currency, rate, rate_date FROM sys_exchange_rate WHERE from_currency = ? AND to_currency = ? ORDER BY rate_date DESC LIMIT 1',
      [fromCurrency, toCurrency]
    );
    if (!row) return null;
    return {
      fromCurrency: row.from_currency,
      toCurrency: row.to_currency,
      rate: parseFloat(row.rate),
      rateDate: new Date(row.rate_date),
    };
  }

  async getRateOnDate(
    fromCurrency: string,
    toCurrency: string,
    date: Date
  ): Promise<ExchangeRate | null> {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const row = await queryOne<ExchangeRateRow>(
      'SELECT from_currency, to_currency, rate, rate_date FROM sys_exchange_rate WHERE from_currency = ? AND to_currency = ? AND rate_date = ? ORDER BY id DESC LIMIT 1',
      [fromCurrency, toCurrency, dateStr]
    );
    if (!row) return null;
    return {
      fromCurrency: row.from_currency,
      toCurrency: row.to_currency,
      rate: parseFloat(row.rate),
      rateDate: new Date(row.rate_date),
    };
  }

  async listActiveCurrencies(): Promise<CurrencyInfo[]> {
    const rows = await query<CurrencyRow>(
      'SELECT code, name, symbol, decimal_places FROM sys_currency WHERE status = 1 AND deleted = 0 ORDER BY sort ASC'
    );
    return rows.map((row) => ({
      code: row.code,
      name: row.name,
      symbol: row.symbol,
      decimalPlaces: row.decimal_places,
    }));
  }
}
