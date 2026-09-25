import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取设备维修统计信息
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

    // 总维修数
    const [totalCount] = await query(
      `SELECT COUNT(*) as count FROM eqp_repair WHERE deleted = 0${dateFilter}`,
      params
    );

    // 本月维修数
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM eqp_repair
       WHERE deleted = 0 AND YEAR(create_time) = YEAR(CURDATE()) AND MONTH(create_time) = MONTH(CURDATE())`
    );

    // 维修费用总计
    const [costResult] = await query(
      `SELECT COALESCE(SUM(COALESCE(cost, '0.00')), 0) as total FROM eqp_repair
       WHERE deleted = 0 AND YEAR(create_time) = YEAR(CURDATE()) AND MONTH(create_time) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        totalCount: totalCount?.count || 0,
        monthlyCount: monthlyResult?.count || 0,
        monthlyCost: Number(costResult?.total) || 0,
      },
    });
  } catch (error) {
    console.error('Get repair stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
