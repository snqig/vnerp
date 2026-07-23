import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSelect, mockFrom } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  getDrizzleDb: () => ({ select: mockSelect }),
}));

vi.mock('@/lib/hr/piece-calculator', () => ({ calculatePieceSalary: vi.fn() }));
vi.mock('@/lib/hr/overtime-calculator', () => ({ calculateOvertimeSalary: vi.fn() }));
vi.mock('@/lib/hr/performance-calculator', () => ({
  calculatePerformanceBonus: vi.fn(), calculateKpiScore: vi.fn(),
}));
vi.mock('@/lib/hr/insurance-calculator', () => ({
  calculateSocialInsurance: vi.fn(), calculateHousingFund: vi.fn(),
}));
vi.mock('@/lib/hr/tax-calculator', () => ({ calculateMonthlyTax: vi.fn() }));

vi.mock('@/domain/hr/infrastructure/SalaryCalculationRepository', () => ({
  SalaryCalculationRepository: class {
    save = vi.fn();
    findByEmployeeMonth = vi.fn();
    batchUpdateStatus = vi.fn();
  },
}));

import { calculateMonthlySalary, batchCalculateSalary } from '@/lib/hr/salary-engine';
import { calculatePieceSalary } from '@/lib/hr/piece-calculator';
import { calculateOvertimeSalary } from '@/lib/hr/overtime-calculator';
import { calculatePerformanceBonus, calculateKpiScore } from '@/lib/hr/performance-calculator';
import { calculateSocialInsurance, calculateHousingFund } from '@/lib/hr/insurance-calculator';
import { calculateMonthlyTax } from '@/lib/hr/tax-calculator';

function mockDbQuery(results: Record<string, unknown>[][]) {
  const whereFn = vi.fn();
  for (const r of results) {
    whereFn.mockReturnValueOnce({
      then: (resolve: (value: unknown) => void) => Promise.resolve(r).then(resolve),
    });
  }
  mockFrom.mockReturnValue({ where: whereFn });
  mockSelect.mockReturnValue({ from: mockFrom });
}

function setupBaseMocks() {
  mockDbQuery([
    [{ id: 1, name: '测试员工', remark: '5000', deleted: 0 }],
    [{ employeeId: 1, baseSalary: '5000', socialInsuranceBase: '5000', housingFundRate: 8, taxDeduction: 5000, status: 1 }],
  ]);

  vi.mocked(calculatePieceSalary).mockResolvedValue({
    details: [], totalAmount: 2000, totalQuantity: 100, totalDefective: 2, avgDefectiveRate: 0.02,
  });
  vi.mocked(calculateOvertimeSalary).mockResolvedValue({
    weekdayHours: 0, weekdayAmount: 0, weekendHours: 8, weekendAmount: 400,
    holidayHours: 0, holidayAmount: 0, totalHours: 8, totalAmount: 500, totalOvertimeAllowance: 100,
  });
  vi.mocked(calculateKpiScore).mockReturnValue(85);
  vi.mocked(calculatePerformanceBonus).mockReturnValue({
    baseAmount: 500, kpiScore: 85, qualityRate: 95, scoreCoefficient: 0.98, finalAmount: 450,
  });
  vi.mocked(calculateSocialInsurance).mockReturnValue({
    personal: { pension: 400, medical: 100, unemployment: 25, total: 525 },
    enterprise: { pension: 800, medical: 400, unemployment: 25, injury: 25, maternity: 25, total: 1275 },
  });
  vi.mocked(calculateHousingFund).mockReturnValue({ personal: 400, enterprise: 400 });
  vi.mocked(calculateMonthlyTax).mockReturnValue({
    taxableIncome: 7950, cumulativeTax: 150, monthlyTax: 150, effectiveRate: 0.0189,
  });
}

function setupZeroMocks() {
  mockDbQuery([
    [{ id: 2, name: '零薪员工', remark: '0', deleted: 0 }],
    [],
  ]);
  vi.mocked(calculatePieceSalary).mockResolvedValue({
    details: [], totalAmount: 0, totalQuantity: 0, totalDefective: 0, avgDefectiveRate: 0,
  });
  vi.mocked(calculateOvertimeSalary).mockResolvedValue({
    weekdayHours: 0, weekdayAmount: 0, weekendHours: 0, weekendAmount: 0,
    holidayHours: 0, holidayAmount: 0, totalHours: 0, totalAmount: 0, totalOvertimeAllowance: 0,
  });
  vi.mocked(calculatePerformanceBonus).mockReturnValue({
    baseAmount: 0, kpiScore: 0, qualityRate: 0, scoreCoefficient: 0, finalAmount: 0,
  });
}

beforeEach(() => { vi.clearAllMocks(); });

describe('salary-engine', () => {
  it('should calculate full salary correctly', async () => {
    setupBaseMocks();
    const result = await calculateMonthlySalary(1, '2026-07');

    expect(result.employeeName).toBe('测试员工');
    expect(result.baseSalary).toBe(5000);
    expect(result.pieceSalary).toBe(2000);
    expect(result.overtimeSalary).toBe(500);
    expect(result.performanceSalary).toBe(450);
    expect(result.grossPay).toBe(7950);
    expect(result.socialInsurancePersonal).toBe(525);
    expect(result.housingFundPersonal).toBe(400);
    expect(result.individualTax).toBe(150);
    expect(result.totalDeduction).toBe(1075);
    expect(result.netPay).toBe(6875);
    expect(result.status).toBe('draft');
  });

  it('should exclude piece salary when option is false', async () => {
    setupBaseMocks();
    const result = await calculateMonthlySalary(1, '2026-07', { includePiece: false });
    expect(result.pieceSalary).toBe(0);
    expect(result.grossPay).toBe(5950);
  });

  it('should exclude overtime when option is false', async () => {
    setupBaseMocks();
    const result = await calculateMonthlySalary(1, '2026-07', { includeOvertime: false });
    expect(result.overtimeSalary).toBe(0);
    expect(result.grossPay).toBe(7450);
  });

  it('should exclude insurance when option is false', async () => {
    setupBaseMocks();
    const result = await calculateMonthlySalary(1, '2026-07', { includeInsurance: false });
    expect(result.socialInsurancePersonal).toBe(0);
    expect(result.housingFundPersonal).toBe(0);
    expect(result.totalDeduction).toBe(150);
  });

  it('should exclude tax when option is false', async () => {
    setupBaseMocks();
    const result = await calculateMonthlySalary(1, '2026-07', { includeTax: false });
    expect(result.individualTax).toBe(0);
  });

  it('should handle zero base salary', async () => {
    setupZeroMocks();
    const result = await calculateMonthlySalary(2, '2026-07');

    expect(result.baseSalary).toBe(0);
    expect(result.grossPay).toBe(0);
    expect(result.netPay).toBe(0);
  });

  it('should cap net pay at 0 when deductions exceed gross pay', async () => {
    mockDbQuery([
      [{ id: 3, name: '低薪员工', remark: '1000', deleted: 0 }],
      [{ employeeId: 3, baseSalary: '1000', socialInsuranceBase: '5000', housingFundRate: 8, taxDeduction: 0, status: 1 }],
    ]);
    vi.mocked(calculatePerformanceBonus).mockReturnValue({
      baseAmount: 0, kpiScore: 0, qualityRate: 0, scoreCoefficient: 0, finalAmount: 0,
    });

    const result = await calculateMonthlySalary(3, '2026-07');
    expect(result.netPay).toBe(0);
  });

  it('should batch calculate multiple employees', async () => {
    mockDbQuery([
      [{ id: 1, name: '员工1', remark: '5000', deleted: 0 }],
      [{ employeeId: 1, baseSalary: '5000', socialInsuranceBase: '5000', housingFundRate: 8, taxDeduction: 5000, status: 1 }],
      [{ id: 2, name: '员工2', remark: '5000', deleted: 0 }],
      [{ employeeId: 2, baseSalary: '5000', socialInsuranceBase: '5000', housingFundRate: 8, taxDeduction: 5000, status: 1 }],
    ]);

    const results = await batchCalculateSalary([1, 2], '2026-07');

    expect(results).toHaveLength(2);
    expect(results[0].employeeName).toBe('员工1');
    expect(results[1].employeeName).toBe('员工2');
  });
});
