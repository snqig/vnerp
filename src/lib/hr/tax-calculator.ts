/**
 * 个税计算 — 累计预扣法
 *
 * 税率表（综合所得）：
 * 级数 | 全年应纳税所得额       | 税率 | 速算扣除数
 * 1    | ≤ 36,000             | 3%   | 0
 * 2    | 36,001 - 144,000     | 10%  | 2,520
 * 3    | 144,001 - 300,000    | 20%  | 16,920
 * 4    | 300,001 - 420,000    | 25%  | 31,920
 * 5    | 420,001 - 660,000    | 30%  | 52,920
 * 6    | 660,001 - 960,000    | 35%  | 85,920
 * 7    | > 960,000            | 45%  | 181,920
 */

const TAX_BRACKETS = [
  { threshold: 0, rate: 0.03, deduction: 0 },
  { threshold: 36000, rate: 0.1, deduction: 2520 },
  { threshold: 144000, rate: 0.2, deduction: 16920 },
  { threshold: 300000, rate: 0.25, deduction: 31920 },
  { threshold: 420000, rate: 0.3, deduction: 52920 },
  { threshold: 660000, rate: 0.35, deduction: 85920 },
  { threshold: 960000, rate: 0.45, deduction: 181920 },
] as const;

const MONTHLY_DEDUCTION = 5000; // 每月减除费用

export interface TaxResult {
  taxableIncome: number;
  cumulativeTax: number;
  monthlyTax: number;
  effectiveRate: number;
}

/**
 * 累计预扣法计算当月个税
 * @param cumulativeIncome 本年累计收入
 * @param cumulativeTaxPaid 本年已缴个税
 * @param monthCount 当前月份 (1-12)
 * @param specialDeduction 累计专项附加扣除
 */
export function calculateMonthlyTax(
  cumulativeIncome: number,
  cumulativeTaxPaid: number,
  monthCount: number,
  specialDeduction: number = 0
): TaxResult {
  const cumulativeBase = MONTHLY_DEDUCTION * monthCount;
  const taxableIncome = Math.max(
    0,
    cumulativeIncome - cumulativeBase - specialDeduction
  );

  let cumulativeTax = 0;
  for (let i = TAX_BRACKETS.length - 1; i >= 0; i--) {
    if (taxableIncome > TAX_BRACKETS[i].threshold) {
      cumulativeTax =
        taxableIncome * TAX_BRACKETS[i].rate - TAX_BRACKETS[i].deduction;
      break;
    }
  }

  cumulativeTax = Math.max(0, Math.round(cumulativeTax * 100) / 100);
  const monthlyTax = Math.max(0, cumulativeTax - cumulativeTaxPaid);

  return {
    taxableIncome,
    cumulativeTax,
    monthlyTax: Math.round(monthlyTax * 100) / 100,
    effectiveRate: taxableIncome > 0 ? cumulativeTax / taxableIncome : 0,
  };
}

/**
 * 快速计算单月个税（不累计）
 */
export function calculateSimpleTax(
  monthlyIncome: number,
  specialDeduction: number = 0
): number {
  const taxable = Math.max(0, monthlyIncome - MONTHLY_DEDUCTION - specialDeduction);
  if (taxable <= 0) return 0;

  for (let i = TAX_BRACKETS.length - 1; i >= 0; i--) {
    if (taxable * 12 > TAX_BRACKETS[i].threshold) {
      const annualTax =
        taxable * 12 * TAX_BRACKETS[i].rate - TAX_BRACKETS[i].deduction;
      return Math.max(0, Math.round((annualTax / 12) * 100) / 100);
    }
  }
  return 0;
}
