import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取销售出库统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Warehouse');
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

    // 待出库
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM wh_outbound_order WHERE deleted = 0 AND type = 'sales' AND status = 1${dateFilter}`,
      params
    );

    // 部分出库
    const [partialResult] = await query(
      `SELECT COUNT(*) as count FROM wh_outbound_order WHERE deleted = 0 AND type = 'sales' AND status = 2${dateFilter}`,
      params
    );

    // 已出库
    const [completedResult] = await query(
      `SELECT COUNT(*) as count FROM wh_outbound_order WHERE deleted = 0 AND type = 'sales' AND status = 3${dateFilter}`,
      params
    );

    // 今日出库单数
    const [todayResult] = await query(
      `SELECT COUNT(*) as count FROM wh_outbound_order 
       WHERE deleted = 0 AND type = 'sales' AND DATE(created_at) = CURDATE()`
    );

    // 本月出库金额
    const [monthlyResult] = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM wh_outbound_order 
       WHERE deleted = 0 AND type = 'sales' AND status = 3 
       AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        partial: partialResult?.count || 0,
        completed: completedResult?.count || 0,
        todayCount: todayResult?.count || 0,
        monthlyAmount: Number(monthlyResult?.total) || 0,
      },
    });
  } catch (error) {
    console.error('Get sales outbound stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
