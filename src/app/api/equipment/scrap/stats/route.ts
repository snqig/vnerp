import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取设备报废统计信息
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

    // 待审批：status = 1
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM eqp_scrap WHERE deleted = 0 AND status = 1${dateFilter}`,
      params
    );

    // 已审批：status = 2
    const [approvedResult] = await query(
      `SELECT COUNT(*) as count FROM eqp_scrap WHERE deleted = 0 AND status = 2${dateFilter}`,
      params
    );

    // 已报废：status = 3
    const [scrappedResult] = await query(
      `SELECT COUNT(*) as count FROM eqp_scrap WHERE deleted = 0 AND status = 3${dateFilter}`,
      params
    );

    // 本月报废数
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM eqp_scrap
       WHERE deleted = 0 AND YEAR(create_time) = YEAR(CURDATE()) AND MONTH(create_time) = MONTH(CURDATE())`
    );

    // 报废设备原值总计
    const [valueResult] = await query(
      `SELECT COALESCE(SUM(original_value), 0) as total FROM eqp_scrap
       WHERE deleted = 0 AND YEAR(create_time) = YEAR(CURDATE()) AND MONTH(create_time) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        approved: approvedResult?.count || 0,
        scrapped: scrappedResult?.count || 0,
        monthlyCount: monthlyResult?.count || 0,
        monthlyOriginalValue: Number(valueResult?.total) || 0,
      },
    });
  } catch (error) {
    console.error('Get scrap stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
