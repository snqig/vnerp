import { NextRequest } from 'next/server';
import { withPermission } from '@/lib/api-permissions';
import { successResponse, errorResponse } from '@/lib/api-response';
import { getDrizzleDb } from '@/lib/db';
import { eq, and, inArray } from 'drizzle-orm';
import { hrSalaryCalculation, sysEmployee } from '@/lib/db/schema';

const db = getDrizzleDb();

export const POST = withPermission(async (request: NextRequest) => {
  const body = await request.json();
  const { employeeIds, month } = body;

  if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
    return errorResponse('缺少员工ID列表', 400, 400);
  }
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return errorResponse('月份格式错误 (YYYY-MM)', 400, 400);
  }

  const calculations = await db.select()
    .from(hrSalaryCalculation)
    .where(and(
      eq(hrSalaryCalculation.calcMonth, month),
      inArray(hrSalaryCalculation.employeeId, employeeIds),
    ));

  if (calculations.length === 0) {
    return errorResponse('未找到符合条件的薪资计算结果', 404, 404);
  }

  const ids = calculations.map(c => c.id);
  const allConfirmed = calculations.every(c => c.status === 'confirmed' || c.status === 'paid');
  if (!allConfirmed) {
    const pendingNames = calculations
      .filter(c => c.status !== 'confirmed' && c.status !== 'paid')
      .map(c => c.employeeId)
      .join(', ');
    return errorResponse(`以下员工薪资尚未确认: ${pendingNames}`, 400, 400);
  }

  const alreadyPaid = calculations.filter(c => c.status === 'paid');
  if (alreadyPaid.length > 0) {
    return errorResponse(`员工 ${alreadyPaid.map(c => c.employeeId).join(', ')} 薪资已发放`, 400, 400);
  }

  const employees = await db.select({
    id: sysEmployee.id,
    name: sysEmployee.name,
    bankAccount: sysEmployee.bankAccount,
  })
    .from(sysEmployee)
    .where(inArray(sysEmployee.id, employeeIds));

  const employeeMap = new Map(employees.map(e => [e.id, e]));

  const voucherNo = `TR${month.replace('-', '')}${Date.now().toString().slice(-6)}`;
  let totalNetPay = 0;
  const records: { employeeName: string; bankAccount: string | null; netPay: number }[] = [];

  for (const calc of calculations) {
    const emp = employeeMap.get(calc.employeeId);
    const netPay = Number(calc.netPay);
    totalNetPay += netPay;
    records.push({
      employeeName: emp?.name || `员工ID:${calc.employeeId}`,
      bankAccount: emp?.bankAccount || null,
      netPay,
    });
  }

  await db.update(hrSalaryCalculation)
    .set({ status: 'paid' })
    .where(inArray(hrSalaryCalculation.id, ids));

  return successResponse({
    voucherNo,
    totalAmount: Number(totalNetPay.toFixed(2)),
    employeeCount: records.length,
    records,
  });
}, { errorMessage: '薪资转账生成失败' });
