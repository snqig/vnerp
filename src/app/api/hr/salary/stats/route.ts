import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取薪资统计
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || format(new Date(), 'yyyy-MM');

    // 员工总数
    const [employeeResult] = await query(
      `SELECT COUNT(*) as count FROM sys_employee WHERE status = 1`
    );

    // 已发薪人数
    const [paidResult] = await query(
      `SELECT COUNT(DISTINCT employee_id) as count FROM sys_salary WHERE month = ?`,
      [month]
    );

    // 薪资总额
    const [totalResult] = await query(
      `SELECT COALESCE(SUM(actual_salary), 0) as total FROM sys_salary WHERE month = ?`,
      [month]
    );

    // 平均工资
    const [avgResult] = await query(
      `SELECT COALESCE(AVG(actual_salary), 0) as avg FROM sys_salary WHERE month = ?`,
      [month]
    );

    // 最高工资
    const [maxResult] = await query(
      `SELECT COALESCE(MAX(actual_salary), 0) as max FROM sys_salary WHERE month = ?`,
      [month]
    );

    // 最低工资
    const [minResult] = await query(
      `SELECT COALESCE(MIN(actual_salary), 0) as min FROM sys_salary WHERE month = ?`,
      [month]
    );

    // 部门薪资分布
    const deptStats = await query(
      `SELECT 
        e.dept_name,
        COUNT(*) as count,
        COALESCE(SUM(s.actual_salary), 0) as total
      FROM sys_employee e
      LEFT JOIN sys_salary s ON e.id = s.employee_id AND s.month = ?
      WHERE e.status = 1
      GROUP BY e.dept_id, e.dept_name`,
      [month]
    );

    return NextResponse.json({
      success: true,
      data: {
        totalEmployees: employeeResult.count,
        paidEmployees: paidResult.count,
        totalSalary: totalResult.total,
        avgSalary: Math.round(avgResult.avg),
        maxSalary: maxResult.max,
        minSalary: minResult.min,
        deptStats,
      },
    });
  } catch (error) {
    console.error('获取薪资统计失败:', error);
    return NextResponse.json(
      { success: false, message: '获取薪资统计失败' },
      { status: 500 }
    );
  }
}

function format(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return format.replace('yyyy', String(year)).replace('MM', month);
}
