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
      labels: [], values: [],
      averageSalary: 0, medianSalary: 0, distribution: [],
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
    distribution.push({
      range: `${start}-${end}`,
      count: bucketCount,
    });
  }

  const a = avgs;
  return successResponse({
    labels: ['基本工资', '计件工资', '加班工资', '绩效', '津贴'],
    values: [
      Number(a.avgBase),
      Number(a.avgPiece),
      Number(a.avgOvertime),
      Number(a.avgPerformance),
      Number(a.avgAllowances),
    ],
    averageSalary: Number(a.avgNetPay),
    medianSalary: Math.round(medianSalary),
    distribution,
  });
}, { errorMessage: '获取薪资结构报表失败' });
