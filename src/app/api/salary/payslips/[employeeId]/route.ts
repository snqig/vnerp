import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/api-auth';
import type { DbRow } from '@/types/db';

export const GET = withPermission(
  async (
    _request: NextRequest,
    _userInfo: UserInfo,
    { params }: { params: Promise<{ employeeId: string }> }
  ) => {
    const { employeeId: rawId } = await params;
    const employeeId = Number(rawId);
    if (!rawId || !/^\d+$/.test(rawId)) {
      return errorResponse('员工ID无效', 400, 400);
    }

    const [calc] = await query<DbRow>(
      `SELECT * FROM hr_salary_calculation WHERE employee_id = ? ORDER BY calc_month DESC LIMIT 1`,
      [employeeId]
    );
    if (!calc) {
      return errorResponse('未找到该员工的工资核算数据', 404, 404);
    }

    const [emp] = await query<DbRow>(
      `SELECT name, employee_no, dept_name, position FROM sys_employee WHERE id = ? OR employee_no = ? LIMIT 1`,
      [employeeId, String(employeeId)]
    );

    const num = (v: unknown) => (v == null ? 0 : Number(v) || 0);

    const data = {
      employeeName: emp?.name || `员工#${employeeId}`,
      employeeNo: emp?.employee_no || '',
      department: emp?.dept_name || '',
      position: emp?.position || '',
      month: calc.calc_month,
      basicSalary: num(calc.base_salary),
      pieceSalary: num(calc.piece_salary),
      overtimeSalary: num(calc.overtime_salary),
      performanceSalary: num(calc.performance_salary),
      allowances: num(calc.allowances),
      grossPay: num(calc.gross_pay),
      socialInsurance: num(calc.social_insurance_personal),
      housingFund: num(calc.housing_fund_personal),
      individualTax: num(calc.individual_tax),
      attendanceDeduction: num(calc.attendance_deduction),
      otherDeduction: num(calc.other_deduction),
      totalDeduction: num(calc.total_deduction),
      netPay: num(calc.net_pay),
    };

    return successResponse(data);
  },
  { errorMessage: '获取工资条失败' }
);
