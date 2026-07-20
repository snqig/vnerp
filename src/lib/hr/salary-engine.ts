import { getDrizzleDb } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { hrSalaryProfile, hrSalaryCalculation, sysEmployee } from '@/lib/db/schema';

const db = getDrizzleDb();
import { calculatePieceSalary } from './piece-calculator';
import { calculateOvertimeSalary } from './overtime-calculator';
import { calculatePerformanceBonus, calculateKpiScore } from './performance-calculator';
import { calculateSocialInsurance, calculateHousingFund } from './insurance-calculator';
import { calculateMonthlyTax } from './tax-calculator';
import { SalaryCalculationRepository } from '@/domain/hr/infrastructure/SalaryCalculationRepository';

export interface SalaryEngineOptions {
  includePiece?: boolean;
  includeOvertime?: boolean;
  includePerformance?: boolean;
  includeInsurance?: boolean;
  includeTax?: boolean;
}

export interface SalaryEngineResult {
  employeeId: number;
  employeeName: string;
  month: string;

  // 应发
  baseSalary: number;
  pieceSalary: number;
  overtimeSalary: number;
  performanceSalary: number;
  allowances: number;

  // 应扣
  socialInsurancePersonal: number;
  housingFundPersonal: number;
  individualTax: number;
  attendanceDeduction: number;
  otherDeduction: number;

  // 合计
  grossPay: number;
  totalDeduction: number;
  netPay: number;

  // 元数据
  status: string;
  calcLog: Record<string, unknown>;
}

const calculationRepo = new SalaryCalculationRepository();

export async function calculateMonthlySalary(
  employeeId: number,
  month: string,
  options: SalaryEngineOptions = {}
): Promise<SalaryEngineResult> {
  const {
    includePiece = true,
    includeOvertime = true,
    includePerformance = true,
    includeInsurance = true,
    includeTax = true,
  } = options;

  // 1. 获取员工信息和薪资档案
  const emp = await db.select().from(sysEmployee)
    .where(and(eq(sysEmployee.id, employeeId), eq(sysEmployee.deleted, 0)))
    .then(rows => rows[0]);
  if (!emp) throw new Error(`员工 ${employeeId} 不存在`);

  const profile = await db.select().from(hrSalaryProfile)
    .where(and(
      eq(hrSalaryProfile.employeeId, employeeId),
      eq(hrSalaryProfile.status, 1),
    ))
    .then(rows => rows[0]);

  const baseSalary = profile ? Number(profile.baseSalary) : Number(emp.remark || 0) || 0;
  const insuranceBase = profile ? Number(profile.socialInsuranceBase) : baseSalary;
  const fundRate = profile ? Number(profile.housingFundRate) : 8;
  const taxDeduction = profile ? Number(profile.taxDeduction) : 0;

  // 2. 并行计算各子项
  const [pieceResult, overtimeResult, attendanceDeductions] = await Promise.all([
    includePiece ? calculatePieceSalary(employeeId, month) : { totalAmount: 0 },
    includeOvertime ? calculateOvertimeSalary(baseSalary, employeeId, month) : { totalAmount: 0 },
    calculateAttendanceDeductions(employeeId, month),
  ]);

  // 3. 绩效计算（简化：使用平均KPI 85分）
  const kpiScore = includePerformance ? calculateKpiScore(0.95, 0.98, 0.85, 85) : 0;
  const performanceBase = 500; // 默认绩效基数，可从薪资标准表获取
  const performanceResult = includePerformance
    ? calculatePerformanceBonus(performanceBase, [
        { name: '产量达成率', weight: 40, score: kpiScore },
        { name: '质量合格率', weight: 30, score: 95 },
        { name: '设备稼动率', weight: 15, score: 85 },
        { name: '5S现场管理', weight: 15, score: 85 },
      ], 0.98)
    : { finalAmount: 0 };

  // 4. 应发合计
  const grossPay = baseSalary
    + Number(pieceResult.totalAmount || 0)
    + Number(overtimeResult.totalAmount || 0)
    + Number(performanceResult.finalAmount || 0)
    + 0; // allowances placeholder

  // 5. 社保公积金
  const insurance = includeInsurance
    ? calculateSocialInsurance(insuranceBase)
    : { personal: { total: 0 }, enterprise: { total: 0 } };
  const fund = includeInsurance
    ? calculateHousingFund(insuranceBase, fundRate)
    : { personal: 0, enterprise: 0 };

  // 6. 累计收入个税（假设前几个月累计）
  const monthlyTax = includeTax
    ? calculateMonthlyTax(grossPay, 0, 1, taxDeduction)
    : { monthlyTax: 0 };

  // 7. 应扣合计
  const totalDeduction = Number(insurance.personal.total)
    + Number(fund.personal)
    + Number(monthlyTax.monthlyTax)
    + Number(attendanceDeductions);

  // 8. 实发
  const netPay = Math.max(0, Math.round((grossPay - totalDeduction) * 100) / 100);

  const result: SalaryEngineResult = {
    employeeId,
    employeeName: emp.name,
    month,
    baseSalary,
    pieceSalary: Math.round(Number(pieceResult.totalAmount) * 100) / 100,
    overtimeSalary: Math.round(Number(overtimeResult.totalAmount) * 100) / 100,
    performanceSalary: Math.round(performanceResult.finalAmount * 100) / 100,
    allowances: 0,
    socialInsurancePersonal: Math.round(insurance.personal.total * 100) / 100,
    housingFundPersonal: Math.round(fund.personal * 100) / 100,
    individualTax: Math.round(monthlyTax.monthlyTax * 100) / 100,
    attendanceDeduction: Math.round(attendanceDeductions * 100) / 100,
    otherDeduction: 0,
    grossPay: Math.round(grossPay * 100) / 100,
    totalDeduction: Math.round(totalDeduction * 100) / 100,
    netPay,
    status: 'draft',
    calcLog: {
      pieceDetails: pieceResult,
      overtimeDetails: overtimeResult,
      performanceDetails: performanceResult,
      insuranceDetails: insurance,
      fundDetails: fund,
      taxDetails: monthlyTax,
    },
  };

  // 9. 保存计算结果
  await calculationRepo.save({
    employeeId,
    calcMonth: month,
    baseSalary: String(result.baseSalary),
    pieceSalary: String(result.pieceSalary),
    overtimeSalary: String(result.overtimeSalary),
    performanceSalary: String(result.performanceSalary),
    allowances: String(result.allowances),
    socialInsurancePersonal: String(result.socialInsurancePersonal),
    housingFundPersonal: String(result.housingFundPersonal),
    individualTax: String(result.individualTax),
    attendanceDeduction: String(result.attendanceDeduction),
    otherDeduction: String(result.otherDeduction),
    grossPay: String(result.grossPay),
    totalDeduction: String(result.totalDeduction),
    netPay: String(result.netPay),
    status: 'draft',
    calcLog: JSON.stringify(result.calcLog),
  });

  return result;
}

async function calculateAttendanceDeductions(
  employeeId: number,
  month: string
): Promise<number> {
  // 考勤扣款 = 迟到扣款 + 早退扣款 + 旷工扣款
  // 从 hr_attendance_exception 表获取统计数据
  // 简化实现：默认返回0
  return 0;
}

export async function batchCalculateSalary(
  employeeIds: number[],
  month: string,
  options: SalaryEngineOptions = {}
): Promise<SalaryEngineResult[]> {
  const results: SalaryEngineResult[] = [];
  for (const id of employeeIds) {
    try {
      const r = await calculateMonthlySalary(id, month, options);
      results.push(r);
    } catch (err) {
      console.error(`员工 ${id} 薪资计算失败:`, err);
    }
  }
  return results;
}

export async function confirmSalary(employeeId: number, month: string): Promise<void> {
  const calc = await calculationRepo.findByEmployeeMonth(employeeId, month);
  if (!calc) throw new Error(`未找到 ${employeeId} ${month} 的薪资计算结果`);
  if (calc.status !== 'draft') throw new Error(`薪资已 ${calc.status}，无法重复确认`);
  await calculationRepo.save({ ...calc, status: 'confirmed' });
}

export async function batchConfirmSalary(ids: number[]): Promise<void> {
  await calculationRepo.batchUpdateStatus(ids, 'confirmed');
}
