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
      byDepartment: [],
      byType: [],
      kpi: { avgCostPerHead: 0, productivity: 0 },
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

  const typeItems = [
    { type: 'base', amount: Number(t.totalBase) },
    { type: 'piece', amount: Number(t.totalPiece) },
    { type: 'overtime', amount: Number(t.totalOvertime) },
    { type: 'performance', amount: Number(t.totalPerformance) },
    { type: 'insurance', amount: Number(t.totalInsurance) },
  ];

  const byTypeTotal = typeItems.reduce((s, i) => s + i.amount, 0);

  return successResponse({
    totalCost: grandTotal,
    byDepartment: deptRows.map(d => ({
      deptName: d.dept_name,
      headcount: d.headcount,
      cost: Number(d.cost),
    })),
    byType: typeItems.map(i => ({
      ...i,
      percentage: byTypeTotal > 0 ? Number(((i.amount / byTypeTotal) * 100).toFixed(2)) : 0,
    })),
    kpi: {
      avgCostPerHead: t.headcount > 0 ? Number((grandTotal / t.headcount).toFixed(2)) : 0,
      productivity: 0,
    },
  });
}, { errorMessage: '获取人力成本报表失败' });
