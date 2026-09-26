import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';
import { currentMonthRange, toLocalDateStr } from '@/lib/date-utils';

// 获取外协收货统计信息
// 修正说明：
//   1) 原表 `out_receive` 在库中不存在 —— 真实表是 `outsource_receive`；
//   2) `outsource_receive` 没有 `total_qty` 列（数量在 outsource_receive 的 receive_qty/qualified_qty），
//      「本月收货数量」改为本月收货单数，避免引用不存在的列；
//   3) 时间列是 `create_time`，统计不再用 YEAR()/MONTH() 包裹列。
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Outsource');
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const month = currentMonthRange();
    const today = toLocalDateStr();
    const tomorrow = toLocalDateStr(new Date(Date.now() + 24 * 3600 * 1000));

    let dateFilter = '';
    const params: any[] = [];
    if (startDate && endDate) {
      dateFilter = ' AND create_time >= ? AND create_time <= ?';
      params.push(startDate, `${endDate} 23:59:59`);
    }

    // 待收货
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM outsource_receive WHERE deleted = 0 AND status = 1${dateFilter}`,
      params
    );

    // 部分收货
    const [partialResult] = await query(
      `SELECT COUNT(*) as count FROM outsource_receive WHERE deleted = 0 AND status = 2${dateFilter}`,
      params
    );

    // 已收货
    const [receivedResult] = await query(
      `SELECT COUNT(*) as count FROM outsource_receive WHERE deleted = 0 AND status = 3${dateFilter}`,
      params
    );

    // 今日收货单数
    const [todayResult] = await query(
      `SELECT COUNT(*) as count FROM outsource_receive
       WHERE deleted = 0 AND create_time >= ? AND create_time < ?`,
      [today, tomorrow]
    );

    // 本月收货单数
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM outsource_receive
       WHERE deleted = 0 AND create_time >= ? AND create_time < ?`,
      [month.start, month.end]
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        partial: partialResult?.count || 0,
        received: receivedResult?.count || 0,
        todayCount: todayResult?.count || 0,
        monthlyQty: Number(monthlyResult?.count) || 0,
      },
    });
  } catch (error) {
    console.error('Get outsource receive stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
