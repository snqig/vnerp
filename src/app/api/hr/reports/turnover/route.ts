import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';
import { successResponse } from '@/lib/api-response';
import type { DbRow } from '@/types/db';
import { SELECT_STMT } from '@/lib/db/ddl/hr-reports-turnover';

export const GET = withPermission(
  async (_request: NextRequest) => {
    // 总人数（在职 status=1）；离职人数（exit_date IS NOT NULL）
    const [totals] = await query<DbRow>(
      `SELECT
        COUNT(*) as totalEmployees,
        SUM(CASE WHEN exit_date IS NOT NULL THEN 1 ELSE 0 END) as resignedCount
      FROM sys_employee WHERE deleted = 0 AND status = 1`
    );

    // 入职工月趋势（最近12个月）
    const monthRows = await query<DbRow>(
      `SELECT
        DATE_FORMAT(entry_date, '%Y-%m') as month,
        COUNT(*) as newHires
      FROM sys_employee
      WHERE entry_date IS NOT NULL AND deleted = 0 AND status = 1
        AND entry_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(entry_date, '%Y-%m')
      ORDER BY month`
    );

    // 按部门统计（在职总数 + 已离职数）
    const deptRows = await query<DbRow>(SELECT_STMT);

    // 平均司龄（在职员工）
    const [tenure] = await query<DbRow>(
      `SELECT COALESCE((
        SELECT ROUND(AVG(DATEDIFF(CURDATE(), entry_date)))
        FROM sys_employee WHERE status = 1 AND deleted = 0 AND entry_date IS NOT NULL
      ), 0) as avgTenureDays`
    );

    // 离职月趋势（最近12个月，按 exit_date 月份统计）
    const resignMonthRows = await query<DbRow>(
      `SELECT
        DATE_FORMAT(exit_date, '%Y-%m') as month,
        COUNT(*) as resignations
      FROM sys_employee
      WHERE exit_date IS NOT NULL AND deleted = 0 AND status = 1
        AND exit_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(exit_date, '%Y-%m')
      ORDER BY month`
    );

    const newHireMap = new Map(monthRows.map((m) => [m.month as string, Number(m.newHires)]));
    const resignMap = new Map(resignMonthRows.map((r) => [r.month as string, Number(r.resignations)]));

    const monthlyTrend: {
      month: string;
      newHires: number;
      resignations: number;
      netChange: number;
    }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const newHires = newHireMap.get(key) || 0;
      const resignations = resignMap.get(key) || 0;
      monthlyTrend.push({ month: key, newHires, resignations, netChange: newHires - resignations });
    }

    const resignedCount = Number(totals.resignedCount) || 0;
    const totalEmployees = Number(totals.totalEmployees) || 0;
    const avgTenureDays = Number(tenure.avgTenureDays) || 0;
    const turnoverRate =
      totalEmployees > 0 ? Number(((resignedCount / (totalEmployees + resignedCount)) * 100).toFixed(2)) : 0;

    return successResponse({
      totalEmployees,
      resignedCount,
      avgTenureDays,
      turnoverRate,
      monthlyTrend,
      byDepartment: deptRows.map((d) => {
        const total = Number(d.total) || 0;
        const resigned = Number(d.resigned) || 0;
        return {
          dept_name: d.dept_name,
          total,
          resigned,
          rate: total > 0 ? Number(((resigned / total) * 100).toFixed(2)) : 0,
        };
      }),
    });
  },
  { errorMessage: '获取人力流动报表失败' }
);
