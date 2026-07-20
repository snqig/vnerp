import { NextRequest } from 'next/server';
import { getDrizzleDb } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { hrSalaryCalculation, sysEmployee } from '@/lib/db/schema';
import { withPermission } from '@/lib/api-permissions';
import { successResponse, errorResponse } from '@/lib/api-response';

const db = getDrizzleDb();

export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const employeeId = parseInt(searchParams.get('employeeId') || '');
  const month = searchParams.get('month');

  if (!employeeId || !month) {
    return errorResponse('缺少员工ID或月份', 400);
  }

  const rows = await db.select({
    employeeName: sysEmployee.name,
    employeeNo: sysEmployee.employeeNo,
    deptName: sysEmployee.deptName,
    position: sysEmployee.position,
    calcMonth: hrSalaryCalculation.calcMonth,
    baseSalary: hrSalaryCalculation.baseSalary,
    pieceSalary: hrSalaryCalculation.pieceSalary,
    overtimeSalary: hrSalaryCalculation.overtimeSalary,
    performanceSalary: hrSalaryCalculation.performanceSalary,
    allowances: hrSalaryCalculation.allowances,
    grossPay: hrSalaryCalculation.grossPay,
    socialInsurancePersonal: hrSalaryCalculation.socialInsurancePersonal,
    housingFundPersonal: hrSalaryCalculation.housingFundPersonal,
    individualTax: hrSalaryCalculation.individualTax,
    attendanceDeduction: hrSalaryCalculation.attendanceDeduction,
    otherDeduction: hrSalaryCalculation.otherDeduction,
    totalDeduction: hrSalaryCalculation.totalDeduction,
    netPay: hrSalaryCalculation.netPay,
  })
    .from(hrSalaryCalculation)
    .leftJoin(sysEmployee, eq(hrSalaryCalculation.employeeId, sysEmployee.id))
    .where(and(
      eq(hrSalaryCalculation.employeeId, employeeId),
      eq(hrSalaryCalculation.calcMonth, month),
    ))
    .limit(1);

  if (rows.length === 0) {
    return errorResponse('未找到该月薪资数据', 404);
  }

  const r = rows[0];
  return successResponse({
    employeeName: r.employeeName,
    employeeNo: r.employeeNo || '',
    department: r.deptName || '',
    position: r.position || '',
    month: r.calcMonth,
    basicSalary: Number(r.baseSalary || 0),
    pieceSalary: Number(r.pieceSalary || 0),
    overtimeSalary: Number(r.overtimeSalary || 0),
    performanceSalary: Number(r.performanceSalary || 0),
    allowances: Number(r.allowances || 0),
    grossPay: Number(r.grossPay || 0),
    socialInsurance: Number(r.socialInsurancePersonal || 0),
    housingFund: Number(r.housingFundPersonal || 0),
    individualTax: Number(r.individualTax || 0),
    attendanceDeduction: Number(r.attendanceDeduction || 0),
    otherDeduction: Number(r.otherDeduction || 0),
    totalDeduction: Number(r.totalDeduction || 0),
    netPay: Number(r.netPay || 0),
  });
}, { errorMessage: '获取工资条失败' });
