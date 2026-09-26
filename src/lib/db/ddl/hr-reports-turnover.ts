/**
 * src/app/api/hr/reports/turnover/route.ts 使用的 SQL 常量。
 */

export const SELECT_STMT = `SELECT
        COALESCE(dept_name, '未分配') as dept_name,
        COUNT(*) as total,
        SUM(CASE WHEN exit_date IS NOT NULL THEN 1 ELSE 0 END) as resigned
      FROM sys_employee WHERE deleted = 0 AND status = 1
      GROUP BY dept_name
      ORDER BY total DESC`;
