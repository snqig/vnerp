import { NextRequest } from 'next/server';
import { withPermission } from '@/lib/api-permissions';
import { successResponse, errorResponse } from '@/lib/api-response';
import { getDrizzleDb } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { hrSalaryCalculation, sysEmployee } from '@/lib/db/schema';

const db = getDrizzleDb();

export const POST = withPermission(async (request: NextRequest) => {
  const body = await request.json();
  const { month } = body;

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return errorResponse('月份格式错误 (YYYY-MM)', 400, 400);
  }

  const calculations = await db.select()
    .from(hrSalaryCalculation)
    .where(eq(hrSalaryCalculation.calcMonth, month));

  if (calculations.length === 0) {
    return errorResponse('该月份无薪资计算数据', 404, 404);
  }

  const _employeeIds = [...new Set(calculations.map(c => c.employeeId))];
  const employees = await db.select({
    id: sysEmployee.id,
    name: sysEmployee.name,
  })
    .from(sysEmployee)
    .where(eq(sysEmployee.deleted, 0));

  const employeeMap = new Map(employees.map(e => [e.id, e.name]));

  let socialInsurancePersonalTotal = 0;
  let housingFundPersonalTotal = 0;
  let socialInsuranceEnterpriseTotal = 0;
  let housingFundEnterpriseTotal = 0;

  const breakdown: {
    employeeId: number;
    employeeName: string;
    socialInsurancePersonal: number;
    housingFundPersonal: number;
  }[] = [];

  for (const calc of calculations) {
    const siPersonal = Number(calc.socialInsurancePersonal);
    const hfPersonal = Number(calc.housingFundPersonal);

    socialInsurancePersonalTotal += siPersonal;
    housingFundPersonalTotal += hfPersonal;

    const enterpriseSi = siPersonal;
    const enterpriseHf = hfPersonal;
    socialInsuranceEnterpriseTotal += enterpriseSi;
    housingFundEnterpriseTotal += enterpriseHf;

    breakdown.push({
      employeeId: calc.employeeId,
      employeeName: employeeMap.get(calc.employeeId) || `员工ID:${calc.employeeId}`,
      socialInsurancePersonal: siPersonal,
      housingFundPersonal: hfPersonal,
    });
  }

  const personalTotal = Number((socialInsurancePersonalTotal + housingFundPersonalTotal).toFixed(2));
  const enterpriseTotal = Number((socialInsuranceEnterpriseTotal + housingFundEnterpriseTotal).toFixed(2));

  return successResponse({
    month,
    personalTotal,
    enterpriseTotal,
    grandTotal: Number((personalTotal + enterpriseTotal).toFixed(2)),
    breakdown,
  });
}, { errorMessage: '生成保险汇总失败' });
