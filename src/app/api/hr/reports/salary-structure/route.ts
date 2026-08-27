import { NextRequest } from 'next/server';
import { getDrizzleDb } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { withPermission } from '@/lib/api-permissions';
import { successResponse } from '@/lib/api-response';

const db = getDrizzleDb();

const COLORS = ['#22c55e', '#3b82f6', '#f97316', '#a855f7', '#eab308'];

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
      avgSalary: 0, medianSalary: 0,
      componentBreakdown: [],
      distribution: [],
    });
  }

  const [avgs] = await db.execute(sql`
    SELECT
      COALESCE(ROUND(AVG(base_salary)), 0) as avgBase,
      COALESCE(ROUND(AVG(piece_salary)), 0) as avgPiece,
      COALESCE(ROUND(AVG(overtime_salary)), 0) as avgOvertime,
      COALESCE(ROUND(AVG(performance_salary)), 0) as avgPerformance,
      COALESCE(ROUND(AVG(allowances)), 0) as avgAllowances,
      COALESCE(ROUND(AVG(net_pay)), 0) as avgNetPay
    FROM hr_salary_calculation
    WHERE calc_month = ${calcMonth} AND status = 'confirmed'
  `) as unknown as {
    avgBase: number; avgPiece: number; avgOvertime: number;
    avgPerformance: number; avgAllowances: number; avgNetPay: number;
  }[];

  const componentBreakdown = [
    { name: 'baseSalary', value: Number(avgs.avgBase), color: COLORS[0] },
    { name: 'pieceSalary', value: Number(avgs.avgPiece), color: COLORS[1] },
    { name: 'overtimeSalary', value: Number(avgs.avgOvertime), color: COLORS[2] },
    { name: 'performanceSalary', value: Number(avgs.avgPerformance), color: COLORS[3] },
    { name: 'allowances', value: Number(avgs.avgAllowances), color: COLORS[4] },
  ].filter(c => c.value > 0);

  const netPays = await db.execute(sql`
    SELECT net_pay FROM hr_salary_calculation
    WHERE calc_month = ${calcMonth} AND status = 'confirmed'
    ORDER BY net_pay
  `) as unknown as { net_pay: number }[];

  const salaries = netPays.map(r => Number(r.net_pay));
  const count = salaries.length;

  let medianSalary = 0;
  if (count > 0) {
    const mid = Math.floor(count / 2);
    medianSalary = count % 2 === 0
      ? (salaries[mid - 1] + salaries[mid]) / 2
      : salaries[mid];
  }

  const maxSalary = count > 0 ? Math.max(...salaries) : 0;
  const bucketSize = 2000;
  const distribution: { range: string; count: number }[] = [];
  for (let start = 0; start <= maxSalary; start += bucketSize) {
    const end = start + bucketSize;
    const bucketCount = salaries.filter(s => s >= start && s < end).length;
    if (bucketCount > 0) {
      distribution.push({ range: `${start.toLocaleString()}-${end.toLocaleString()}`, count: bucketCount });
    }
  }

  return successResponse({
    avgSalary: Number(avgs.avgNetPay),
    medianSalary: Math.round(medianSalary),
    componentBreakdown,
    distribution,
  });
}, { errorMessage: '获取薪资结构报表失败' });
