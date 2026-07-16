// src/lib/money-format.ts

/**
 * 根据币种获取 locale
 */
function getLocaleByCurrency(currency: string): string {
  const map: Record<string, string> = {
    CNY: 'zh-CN',
    USD: 'en-US',
    VND: 'vi-VN',
  };
  return map[currency] || 'en-US';
}

/**
 * 币种小数位映射
 */
const DECIMAL_PLACES: Record<string, number> = {
  CNY: 2,
  USD: 2,
  VND: 0,
};

/**
 * 格式化金额为带币种符号的字符串
 * @param amount 金额
 * @param currency 币种代码（CNY/USD/VND）
 * @param decimalPlaces 小数位（不传则按币种默认）
 */
export function formatMoney(
  amount: number,
  currency: string = 'CNY',
  decimalPlaces?: number
): string {
  const digits = decimalPlaces ?? DECIMAL_PLACES[currency] ?? 2;
  try {
    return new Intl.NumberFormat(getLocaleByCurrency(currency), {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    // 币种代码无效时降级为纯数字
    return `${amount.toFixed(digits)}`;
  }
}

/**
 * 格式化金额（不带符号，仅千分位 + 小数位）
 */
export function formatAmount(
  amount: number,
  currency: string = 'CNY',
  decimalPlaces?: number
): string {
  const digits = decimalPlaces ?? DECIMAL_PLACES[currency] ?? 2;
  return new Intl.NumberFormat(getLocaleByCurrency(currency), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

/**
 * 获取币种小数位
 */
export function getDecimalPlaces(currency: string): number {
  return DECIMAL_PLACES[currency] ?? 2;
}
