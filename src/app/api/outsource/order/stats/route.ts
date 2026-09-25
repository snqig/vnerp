import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取外协订单统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Outsource');
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

    // 待下单
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM out_order WHERE deleted = 0 AND status = 1${dateFilter}`,
      params
    );

    // 已下单
    const [orderedResult] = await query(
      `SELECT COUNT(*) as count FROM out_order WHERE deleted = 0 AND status = 2${dateFilter}`,
      params
    );

    // 部分到货
    const [partialResult] = await query(
      `SELECT COUNT(*) as count FROM out_order WHERE deleted = 0 AND status = 3${dateFilter}`,
      params
    );

    // 已完成
    const [completedResult] = await query(
      `SELECT COUNT(*) as count FROM out_order WHERE deleted = 0 AND status = 4${dateFilter}`,
      params
    );

    // 本月外协金额
    const [monthlyResult] = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM out_order 
       WHERE deleted = 0 AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        ordered: orderedResult?.count || 0,
        partial: partialResult?.count || 0,
        completed: completedResult?.count || 0,
        monthlyAmount: Number(monthlyResult?.total) || 0,
      },
    });
  } catch (error) {
    console.error('Get outsource order stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
