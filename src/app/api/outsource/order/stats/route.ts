import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';
import { currentMonthRange } from '@/lib/date-utils';

// 获取外协订单统计信息
// 修正说明：
//   1) 原表 `out_order` 在库中不存在 —— 真实表是 `outsource_order`；
//   2) 时间列是 `create_time`，统计不再用 YEAR()/MONTH() 包裹列。
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Outsource');
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const month = currentMonthRange();

    let dateFilter = '';
    const params: any[] = [];
    if (startDate && endDate) {
      dateFilter = ' AND create_time >= ? AND create_time <= ?';
      params.push(startDate, `${endDate} 23:59:59`);
    }

    // 待下单
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM outsource_order WHERE deleted = 0 AND status = 1${dateFilter}`,
      params
    );

    // 已下单
    const [orderedResult] = await query(
      `SELECT COUNT(*) as count FROM outsource_order WHERE deleted = 0 AND status = 2${dateFilter}`,
      params
    );

    // 部分到货
    const [partialResult] = await query(
      `SELECT COUNT(*) as count FROM outsource_order WHERE deleted = 0 AND status = 3${dateFilter}`,
      params
    );

    // 已完成
    const [completedResult] = await query(
      `SELECT COUNT(*) as count FROM outsource_order WHERE deleted = 0 AND status = 4${dateFilter}`,
      params
    );

    // 本月外协金额
    const [monthlyResult] = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM outsource_order
       WHERE deleted = 0 AND create_time >= ? AND create_time < ?`,
      [month.start, month.end]
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
