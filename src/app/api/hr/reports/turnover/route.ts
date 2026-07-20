import { NextRequest } from 'next/server';
import { getDrizzleDb } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { withPermission } from '@/lib/api-permissions';
import { successResponse } from '@/lib/api-response';

const db = getDrizzleDb();

export const GET = withPermission(async (request: NextRequest) => {
  const [totals] = await db.execute(sql`
    SELECT
      COUNT(*) as totalEmployees,
      SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as resignedCount
    FROM sys_employee WHERE deleted = 0
  `) as unknown as { totalEmployees: number; resignedCount: number }[];

  const monthRows = await db.execute(sql`
    SELECT
      DATE_FORMAT(entry_date, '%Y-%m') as month,
      COUNT(*) as newHires
    FROM sys_employee
    WHERE entry_date IS NOT NULL AND deleted = 0
      AND entry_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY DATE_FORMAT(entry_date, '%Y-%m')
    ORDER BY month
  `) as unknown as { month: string; newHires: number }[];

  const deptRows = await db.execute(sql`
    SELECT
      COALESCE(dept_name, '未分配') as dept_name,
      COUNT(*) as total,
      SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as resigned
    FROM sys_employee WHERE deleted = 0
    GROUP BY dept_id, dept_name
    ORDER BY total DESC
  `) as unknown as { dept_name: string; total: number; resigned: number }[];

  const [tenure] = await db.execute(sql`
    SELECT COALESCE(ROUND(AVG(DATEDIFF(CURDATE(), entry_date))), 0) as avgTenureDays
    FROM sys_employee WHERE status = 1 AND deleted = 0 AND entry_date IS NOT NULL
  `) as unknown as { avgTenureDays: number }[];

  const monthMap = new Map(monthRows.map(m => [m.month, m.newHires]));
  const monthly: { month: string; newHires: number; resignations: number; netChange: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const newHires = monthMap.get(key) || 0;
    monthly.push({ month: key, newHires, resignations: 0, netChange: newHires });
  }

  return successResponse({
    totalEmployees: totals.totalEmployees,
    monthly,
    byDepartment: deptRows.map(d => ({
      deptName: d.dept_name,
      total: d.total,
      resigned: d.resigned,
      turnoverRate: d.total > 0
        ? Number(((d.resigned / d.total) * 100).toFixed(2))
        : 0,
    })),
    avgTenure: tenure.avgTenureDays,
  });
}, { errorMessage: '获取人力流动报表失败' });
