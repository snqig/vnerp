import { NextRequest } from 'next/server';
import { getDrizzleDb } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { withPermission } from '@/lib/api-permissions';
import { successResponse } from '@/lib/api-response';

const db = getDrizzleDb();

export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');

  let calcMonth = month;
  if (!calcMonth) {
    const [latest] = await db.execute(sql`
      SELECT MAX(calc_month) as m FROM hr_salary_calculation WHERE status = 'confirmed'
    `) as unknown as { m: string }[];
    calcMonth = latest?.m || '';
  }

  if (!calcMonth) {
    return successResponse({
      totalCost: 0,
      avgCost: 0,
      headcount: 0,
      costTrend: 0,
      byDepartment: [],
      byType: [],
      monthlyTrend: [],
    });
  }

  const [totals] = await db.execute(sql`
    SELECT
      COALESCE(SUM(gross_pay), 0) as totalCost,
      COALESCE(SUM(base_salary), 0) as totalBase,
      COALESCE(SUM(piece_salary), 0) as totalPiece,
      COALESCE(SUM(overtime_salary), 0) as totalOvertime,
      COALESCE(SUM(performance_salary), 0) as totalPerformance,
      COALESCE(SUM(social_insurance_personal + housing_fund_personal), 0) as totalInsurance,
      COUNT(DISTINCT employee_id) as headcount
    FROM hr_salary_calculation
    WHERE calc_month = ${calcMonth} AND status = 'confirmed'
  `) as unknown as {
    totalCost: number; totalBase: number; totalPiece: number;
    totalOvertime: number; totalPerformance: number; totalInsurance: number;
    headcount: number;
  }[];

  const t = totals;
  const grandTotal = Number(t.totalCost);
  const headcount = Number(t.headcount);
  const avgCost = headcount > 0 ? Number((grandTotal / headcount).toFixed(2)) : 0;

  const deptRows = await db.execute(sql`
    SELECT
      e.dept_name,
      COUNT(DISTINCT e.id) as headcount,
      COALESCE(SUM(s.gross_pay), 0) as cost
    FROM hr_salary_calculation s
    JOIN sys_employee e ON s.employee_id = e.id
    WHERE s.calc_month = ${calcMonth} AND s.status = 'confirmed'
    GROUP BY e.dept_id, e.dept_name
    ORDER BY cost DESC
  `) as unknown as { dept_name: string; headcount: number; cost: number }[];

  const deptTotal = deptRows.reduce((s, d) => s + Number(d.cost), 0);

  const typeItems = [
    { type: 'base', cost: Number(t.totalBase) },
    { type: 'piece', cost: Number(t.totalPiece) },
    { type: 'overtime', cost: Number(t.totalOvertime) },
    { type: 'performance', cost: Number(t.totalPerformance) },
    { type: 'insurance', cost: Number(t.totalInsurance) },
  ];

  const byTypeTotal = typeItems.reduce((s, i) => s + i.cost, 0);

  const [calcYear, calcMonthNum] = calcMonth.split('-').map(Number);
  const lastMonthDate = new Date(calcYear, calcMonthNum - 2, 1);
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const [lastMonthTotal] = await db.execute(sql`
    SELECT COALESCE(SUM(gross_pay), 0) as totalCost FROM hr_salary_calculation
    WHERE calc_month = ${lastMonth} AND status = 'confirmed'
  `) as unknown as { totalCost: number }[];
  const costTrend = lastMonthTotal && lastMonthTotal.totalCost > 0
    ? Number((((grandTotal - Number(lastMonthTotal.totalCost)) / Number(lastMonthTotal.totalCost)) * 100).toFixed(2))
    : 0;

  const monthlyTrend = await db.execute(sql`
    SELECT
      calc_month as month,
      COALESCE(SUM(base_salary), 0) as base,
      COALESCE(SUM(piece_salary), 0) as piece,
      COALESCE(SUM(overtime_salary), 0) as overtime,
      COALESCE(SUM(performance_salary), 0) as performance,
      COALESCE(SUM(social_insurance_personal + housing_fund_personal), 0) as insurance
    FROM hr_salary_calculation
    WHERE calc_month >= DATE_SUB(${calcMonth}, INTERVAL 5 MONTH) AND status = 'confirmed'
    GROUP BY calc_month
    ORDER BY calc_month
  `) as unknown as { month: string; base: number; piece: number; overtime: number; performance: number; insurance: number }[];

  return successResponse({
    totalCost: grandTotal,
    avgCost,
    headcount,
    costTrend,
    byDepartment: deptRows.map(d => ({
      dept_name: d.dept_name,
      cost: Number(d.cost),
      percentage: deptTotal > 0 ? Number(((Number(d.cost) / deptTotal) * 100).toFixed(2)) : 0,
    })),
    byType: typeItems.map(i => ({
      ...i,
      percentage: byTypeTotal > 0 ? Number(((i.cost / byTypeTotal) * 100).toFixed(2)) : 0,
    })),
    monthlyTrend: monthlyTrend.map(m => ({
      month: m.month,
      base: Number(m.base),
      piece: Number(m.piece),
      overtime: Number(m.overtime),
      performance: Number(m.performance),
      insurance: Number(m.insurance),
    })),
  });
}, { errorMessage: '获取人力成本报表失败' });
