// 金额处理工具类 - 使用 Decimal.js 消除浮点误差，整数分存储

import {
  yuanToFen as decimalYuanToFen,
  fenToYuan as decimalFenToYuan,
  multiplyMoney as decimalMultiplyMoney,
  divideMoney as decimalDivideMoney,
  calculateTaxFen,
} from './decimal-utils';

/**
 * 将元转换为分（用于存储）— Decimal.js 精度
 */
export function yuanToFen(yuan: number | string): number {
  const num = typeof yuan === 'string' ? parseFloat(yuan) : yuan;
  if (isNaN(num)) {
    throw new Error('Invalid amount');
  }
  return decimalYuanToFen(num);
}

/**
 * 将分转换为元（用于显示）
 */
export function fenToYuan(fen: number | string, decimals: number = 2): number {
  const num = typeof fen === 'string' ? parseInt(fen, 10) : fen;
  if (isNaN(num)) {
    throw new Error('Invalid amount');
  }
  return decimalFenToYuan(num, decimals);
}

/**
 * 格式化金额为货币字符串
 * @param fen 分为单位的整数
 * @param symbol 货币符号，默认¥
 * @returns 格式化后的字符串
 */
export function formatMoney(fen: number | string, symbol: string = '¥'): string {
  const yuan = fenToYuan(fen);
  return `${symbol}${yuan.toFixed(2)}`;
}

/**
 * 金额加法（避免浮点误差）
 * @param amounts 分单位的金额数组
 * @returns 总和（分）
 */
export function addMoney(...amounts: number[]): number {
  return amounts.reduce((sum, amount) => sum + amount, 0);
}

/**
 * 金额减法
 * @param a 被减数（分）
 * @param b 减数（分）
 * @returns 差（分）
 */
export function subtractMoney(a: number, b: number): number {
  return a - b;
}

/**
 * 金额乘法
 * @param amount 金额（分）
 * @param quantity 数量
 * @returns 乘积（分）
 */
export function multiplyMoney(amount: number, quantity: number): number {
  return decimalMultiplyMoney(amount, quantity);
}

/**
 * 金额除法 — Decimal.js 精度
 */
export function divideMoney(amount: number, divisor: number): number {
  return decimalDivideMoney(amount, divisor);
}

/**
 * 计算订单总金额
 * @param items 订单项数组，每项包含price（分）和quantity
 * @returns 总金额（分）
 */
export function calculateOrderTotal(items: Array<{ price: number; quantity: number }>): number {
  return items.reduce((total, item) => {
    return total + multiplyMoney(item.price, item.quantity);
  }, 0);
}

/**
 * 计算税额
 * @param amount 金额（分）
 * @param taxRate 税率，如0.13表示13%
 * @returns 税额（分）
 */
export function calculateTax(amount: number, taxRate: number): number {
  // taxRate is passed as decimal (0.13), convert to percent for calculateTaxFen
  const taxRatePercent = taxRate * 100;
  return calculateTaxFen(amount, taxRatePercent);
}

/**
 * 计算含税总价
 * @param amount 不含税金额（分）
 * @param taxRate 税率
 * @returns 含税总价（分）
 */
export function calculateTotalWithTax(amount: number, taxRate: number): number {
  const tax = calculateTax(amount, taxRate);
  return amount + tax;
}

/**
 * 验证金额是否有效
 * @param amount 金额（分）
 * @returns 是否有效
 */
export function isValidAmount(amount: number): boolean {
  return !isNaN(amount) && isFinite(amount) && amount >= 0;
}

/**
 * 比较两个金额
 * @param a 金额A（分）
 * @param b 金额B（分）
 * @returns -1: a<b, 0: a=b, 1: a>b
 */
export function compareMoney(a: number, b: number): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
