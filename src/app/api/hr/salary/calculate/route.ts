import { NextRequest } from 'next/server';
import { withPermission } from '@/lib/api-permissions';
import { successResponse, errorResponse } from '@/lib/api-response';
import { calculateMonthlySalary, batchCalculateSalary } from '@/lib/hr/salary-engine';
import { SalaryCalculationRepository } from '@/domain/hr/infrastructure/SalaryCalculationRepository';
import { getDrizzleDb } from '@/lib/db';
import { sysEmployee } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const db = getDrizzleDb();
const calcRepo = new SalaryCalculationRepository();

/**
 * POST /api/hr/salary/calculate
 * Body: { employeeId: number, month: string, options?: SalaryEngineOptions }
 * 单员工薪资计算
 */
export const POST = withPermission(async (request: NextRequest) => {
  const body = await request.json();
  const { employeeId, month, options } = body;

  if (!employeeId || !month) {
    return errorResponse('缺少员工ID或计算月份', 400, 400);
  }
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return errorResponse('月份格式错误 (YYYY-MM)', 400, 400);
  }

  const result = await calculateMonthlySalary(employeeId, month, options || {});
  return successResponse(result);
}, { errorMessage: '薪资计算失败' });

/**
 * PUT /api/hr/salary/calculate
 * Body: { employeeIds: number[], month: string }
 * 批量薪资计算
 */
export const PUT = withPermission(async (request: NextRequest) => {
  const body = await request.json();
  const { employeeIds, month, options } = body;

  if (!month) {
    return errorResponse('缺少计算月份', 400, 400);
  }

  let targetIds = employeeIds;
  if (!targetIds?.length) {
    const employees = await db.select({ id: sysEmployee.id }).from(sysEmployee)
      .where(eq(sysEmployee.status, 1));
    targetIds = employees.map(e => e.id);
    console.log(`[BatchSalaryCalc] 自动获取员工列表: ${targetIds.length} 人`);
  }

  if (!targetIds.length) {
    return errorResponse('未找到任何员工', 400, 400);
  }

  const results = await batchCalculateSalary(targetIds, month, options || {});
  return successResponse({
    total: results.length,
    succeeded: results.length,
    results,
  });
}, { errorMessage: '批量薪资计算失败' });

/**
 * GET /api/hr/salary/calculate?employeeId=1&month=2026-07
 * 查询某个员工某月的计算结果
 */
export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const employeeId = parseInt(searchParams.get('employeeId') || '');
  const month = searchParams.get('month');

  if (!employeeId || !month) {
    return errorResponse('缺少员工ID或月份', 400, 400);
  }

  const calc = await calcRepo.findByEmployeeMonth(employeeId, month);
  if (!calc) {
    return errorResponse('未找到计算结果', 404, 404);
  }

  return successResponse(calc);
}, { errorMessage: '查询薪资计算结果失败' });
