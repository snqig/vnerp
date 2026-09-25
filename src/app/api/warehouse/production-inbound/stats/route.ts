import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取生产入库统计信息
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

    // 待入库
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM wh_inbound_order WHERE deleted = 0 AND type = 'production' AND status = 1${dateFilter}`,
      params
    );

    // 部分入库
    const [partialResult] = await query(
      `SELECT COUNT(*) as count FROM wh_inbound_order WHERE deleted = 0 AND type = 'production' AND status = 2${dateFilter}`,
      params
    );

    // 已入库
    const [completedResult] = await query(
      `SELECT COUNT(*) as count FROM wh_inbound_order WHERE deleted = 0 AND type = 'production' AND status = 3${dateFilter}`,
      params
    );

    // 今日入库单数
    const [todayResult] = await query(
      `SELECT COUNT(*) as count FROM wh_inbound_order 
       WHERE deleted = 0 AND type = 'production' AND DATE(created_at) = CURDATE()`
    );

    // 本月入库数量
    const [monthlyResult] = await query(
      `SELECT COALESCE(SUM(total_qty), 0) as total FROM wh_inbound_order 
       WHERE deleted = 0 AND type = 'production' AND status = 3 
       AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        partial: partialResult?.count || 0,
        completed: completedResult?.count || 0,
        todayCount: todayResult?.count || 0,
        monthlyQty: Number(monthlyResult?.total) || 0,
      },
    });
  } catch (error) {
    console.error('Get production inbound stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
