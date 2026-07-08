/**
 * @module decimal-utils
 * @description 统一精度计算工具 — 基于 Decimal.js 消除浮点误差。
 *   全项目金额/成本计算统一使用本模块，替代 Math.round。
 *
 *   精度规范:
 *   - 金额: 2 位小数（分）
 *   - 单价/成本: 4 位小数
 *   - 税率/比例: 4 位小数
 */

import Decimal from 'decimal.js';

Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -9,
  toExpPos: 21,
});

/**
 * 金额舍入到 2 位小数（分）
 */
export function roundAmount(value: number | string | Decimal): number {
  return new Decimal(value || 0).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * 单价/成本舍入到 4 位小数
 */
export function roundPrice(value: number | string | Decimal): number {
  return new Decimal(value || 0).toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * 通用舍入到指定小数位
 */
export function roundTo(value: number | string | Decimal, precision: number): number {
  return new Decimal(value || 0).toDecimalPlaces(precision, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * 元转分（使用 Decimal 消除浮点误差）
 */
export function yuanToFen(yuan: number | string): number {
  const d = new Decimal(yuan || 0);
  return d.times(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * 分转元
 */
export function fenToYuan(fen: number | string, decimals: number = 2): number {
  const d = new Decimal(fen || 0);
  return d.dividedBy(100).toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * 金额乘法（分 × 数量 → 分）
 */
export function multiplyMoney(amountFen: number, quantity: number): number {
  const d = new Decimal(amountFen || 0).times(quantity || 0);
  return d.dividedBy(100).times(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * 金额除法（分 ÷ 除数 → 分）
 */
export function divideMoney(amountFen: number, divisor: number): number {
  if (!divisor) throw new Error('Division by zero');
  const d = new Decimal(amountFen || 0).dividedBy(divisor);
  return d.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * 计算税额（分）
 * @param amountFen 不含税金额（分）
 * @param taxRatePercent 税率百分比，如 13 表示 13%
 */
export function calculateTaxFen(amountFen: number, taxRatePercent: number): number {
  const d = new Decimal(amountFen || 0).times(taxRatePercent || 0).dividedBy(100);
  return d.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Decimal 加法（返回 number）
 */
export function addDecimal(...values: (number | string | Decimal)[]): number {
  let sum = new Decimal(0);
  for (const v of values) {
    sum = sum.plus(new Decimal(v || 0));
  }
  return sum.toNumber();
}

/**
 * Decimal 减法（返回 number）
 */
export function subtractDecimal(a: number | string | Decimal, b: number | string | Decimal): number {
  return new Decimal(a || 0).minus(new Decimal(b || 0)).toNumber();
}

/**
 * Decimal 乘法（返回 number）
 */
export function multiplyDecimal(a: number | string | Decimal, b: number | string | Decimal): number {
  return new Decimal(a || 0).times(new Decimal(b || 0)).toNumber();
}

/**
 * Decimal 除法（返回 number）
 */
export function divideDecimal(a: number | string | Decimal, b: number | string | Decimal): number {
  const divisor = new Decimal(b || 0);
  if (divisor.isZero()) throw new Error('Division by zero');
  return new Decimal(a || 0).dividedBy(divisor).toNumber();
}
