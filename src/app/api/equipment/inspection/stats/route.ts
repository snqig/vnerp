import { getTranslations } from 'next-intl/server';

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取设备点检统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Equipment');
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateFilter = '';
    const params: any[] = [];

    if (startDate && endDate) {
      dateFilter = ' AND DATE(inspection_date) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    // 总点检数
    const [totalCount] = await query(
      `SELECT COUNT(*) as count FROM eqp_inspection WHERE deleted = 0${dateFilter}`,
      params
    );

    // 异常点检：result = 2
    const [abnormalResult] = await query(
      `SELECT COUNT(*) as count FROM eqp_inspection WHERE deleted = 0 AND result = 2`
    );

    // 本月点检次数
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM eqp_inspection WHERE deleted = 0 AND YEAR(inspection_date) = YEAR(CURDATE()) AND MONTH(inspection_date) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        totalCount: totalCount?.count || 0,
        abnormal: abnormalResult?.count || 0,
        monthlyCount: monthlyResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get inspection stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});