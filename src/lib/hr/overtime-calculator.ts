import { getDrizzleDb } from '@/lib/db';
import { eq, and, gte, lte } from 'drizzle-orm';
import { hrAttendance, hrShift } from '@/lib/db/schema';

const db = getDrizzleDb();

export interface OvertimeResult {
  weekdayHours: number;
  weekdayAmount: number;
  weekendHours: number;
  weekendAmount: number;
  holidayHours: number;
  holidayAmount: number;
  totalHours: number;
  totalAmount: number;
  totalOvertimeAllowance: number;
}

const MONTHLY_WORK_DAYS = 21.75;
const DAILY_WORK_HOURS = 8;

/**
 * 根据考勤记录计算加班工资
 * @param baseSalary 基本工资
 * @param employeeId 员工ID
 * @param month 月份 YYYY-MM
 * @param shiftId 班次ID（可选）
 */
export async function calculateOvertimeSalary(
  baseSalary: number,
  employeeId: number,
  month: string,
  shiftId?: number
): Promise<OvertimeResult> {
  const [year, mon] = month.split('-');
  const startDate = `${year}-${mon}-01`;
  const endDate = `${year}-${mon}-31`;

  const records = await db.select().from(hrAttendance)
    .where(and(
      eq(hrAttendance.employeeId, employeeId),
      gte(hrAttendance.attendanceDate, new Date(startDate)),
      lte(hrAttendance.attendanceDate, new Date(endDate)),
      eq(hrAttendance.deleted, 0),
    ));

  // 计算小时工资
  const hourlyRate = baseSalary / MONTHLY_WORK_DAYS / DAILY_WORK_HOURS;

  // 获取班次信息（如果指定了班次）
  let shiftOvertimeRate = 1.5;
  if (shiftId) {
    const shift = await db.select().from(hrShift)
      .where(eq(hrShift.id, shiftId))
      .then(rows => rows[0]);
    if (shift) shiftOvertimeRate = Number(shift.overtimeRate);
  }

  let weekdayHours = 0;
  let weekendHours = 0;
  let holidayHours = 0;

  for (const r of records) {
    const overtimeHours = Number(r.overtimeHours || 0);
    if (overtimeHours <= 0) continue;

    const date = new Date(r.attendanceDate);
    const dayOfWeek = date.getDay();

    // 判断加班类型: 0=周日(周末), 6=周六(周末), 1-5=工作日
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendHours += overtimeHours;
    } else {
      weekdayHours += overtimeHours;
    }
  }

  const weekdayAmount = weekdayHours * hourlyRate * shiftOvertimeRate;
  const weekendAmount = weekendHours * hourlyRate * 2;
  const holidayAmount = holidayHours * hourlyRate * 3;

  const totalHours = weekdayHours + weekendHours + holidayHours;
  const totalAmount = weekdayAmount + weekendAmount + holidayAmount;

  // 加班上限校验（每月不超过36小时）
  if (totalHours > 36) {
    console.warn(`员工 ${employeeId} ${month} 加班 ${totalHours}h，超过法定上限36h`);
  }

  return {
    weekdayHours,
    weekdayAmount,
    weekendHours,
    weekendAmount,
    holidayHours,
    holidayAmount,
    totalHours,
    totalAmount,
    totalOvertimeAllowance: 0,
  };
}
