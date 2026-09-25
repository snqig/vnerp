import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取排班管理统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Hr');
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateFilter = '';
    const params: any[] = [];

    if (startDate && endDate) {
      dateFilter = ' AND DATE(created_at) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    // 今日排班人数
    const [todayResult] = await query(
      `SELECT COUNT(DISTINCT employee_id) as count FROM hr_schedule 
       WHERE deleted = 0 AND schedule_date = CURDATE()`
    );

    // 本周排班人数
    const [weekResult] = await query(
      `SELECT COUNT(DISTINCT employee_id) as count FROM hr_schedule 
       WHERE deleted = 0 AND YEARWEEK(schedule_date, 1) = YEARWEEK(CURDATE(), 1)`
    );

    // 本月排班次数
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM hr_schedule 
       WHERE deleted = 0 AND YEAR(schedule_date) = YEAR(CURDATE()) AND MONTH(schedule_date) = MONTH(CURDATE())`
    );

    // 班次总数
    const [shiftResult] = await query(
      `SELECT COUNT(*) as count FROM hr_shift WHERE deleted = 0`
    );

    // 迟到人数（今日）
    const [lateResult] = await query(
      `SELECT COUNT(DISTINCT employee_id) as count FROM hr_attendance 
       WHERE deleted = 0 AND DATE(check_in) = CURDATE() AND status = 2`
    );

    return NextResponse.json({
      success: true,
      data: {
        todayScheduled: todayResult?.count || 0,
        weekScheduled: weekResult?.count || 0,
        monthlyCount: monthlyResult?.count || 0,
        totalShifts: shiftResult?.count || 0,
        todayLate: lateResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get schedules stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
