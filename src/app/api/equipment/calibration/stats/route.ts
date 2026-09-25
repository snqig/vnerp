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

    // 总校准数
    const [totalCount] = await query(
      `SELECT COUNT(*) as count FROM eqp_calibration WHERE deleted = 0${dateFilter}`,
      params
    );

    // 逾期未校准：next_calibration_date < CURDATE() AND deleted=0
    const [overdueResult] = await query(
      `SELECT COUNT(*) as count FROM eqp_calibration
       WHERE deleted = 0 AND next_calibration_date < CURDATE()`
    );

    // 本月校准次数
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM eqp_calibration
       WHERE deleted = 0 AND YEAR(create_time) = YEAR(CURDATE()) AND MONTH(create_time) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        totalCount: totalCount?.count || 0,
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
