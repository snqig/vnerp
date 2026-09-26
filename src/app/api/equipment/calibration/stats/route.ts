import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取设备校准统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Equipment');
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateFilter = '';
    const params: any[] = [];

    if (startDate && endDate) {
      dateFilter = ' AND DATE(create_time) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    // 待校准：status = 1
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM eqp_calibration WHERE deleted = 0 AND status = 1${dateFilter}`,
      params
    );

    // 检定中：status = 2
    const [calibratingResult] = await query(
      `SELECT COUNT(*) as count FROM eqp_calibration WHERE deleted = 0 AND status = 2${dateFilter}`,
      params
    );

    // 已合格：status = 3
    const [completedResult] = await query(
      `SELECT COUNT(*) as count FROM eqp_calibration WHERE deleted = 0 AND status = 3${dateFilter}`,
      params
    );

    // 不合格：status = 4（计入逾期辅助显示）
    const [overdueResult] = await query(
      `SELECT COUNT(*) as count FROM eqp_calibration
       WHERE deleted = 0 AND (next_calibration_date < CURDATE() OR status = 4)`
    );

    // 本月校准次数
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM eqp_calibration
       WHERE deleted = 0 AND YEAR(create_time) = YEAR(CURDATE()) AND MONTH(create_time) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        calibrating: calibratingResult?.count || 0,
        completed: completedResult?.count || 0,
        overdue: overdueResult?.count || 0,
        monthlyCount: monthlyResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get calibration stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
