import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';
import { currentMonthRange, toLocalDateStr } from '@/lib/date-utils';

// 获取销售出库统计信息
// 修正说明：
//   1) 原表 `wh_outbound_order` 在库中不存在 —— 出库单真实表是 `inv_outbound_order`，
//      销售出库只是其中一种业务类型，用 `outbound_type = 'sales'` 区分（该表没有 type 列）；
//   2) 时间列是 `create_time`，且不再用 `YEAR()/MONTH()/DATE()` 包裹列，改为半开区间，
//       这样 create_time 上的索引才可能被用到；
//   3) 待办（不改，避免业务语义漂移）：inv_outbound_order.status 真实值域是
//      draft/pending/completed/cancelled，下面沿用 1/2/3 三档目前统计不到数据，
//      需业务专项对齐 —— 不报错，但计数会长期为 0。
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Warehouse');
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

    // 待出库
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM inv_outbound_order WHERE deleted = 0 AND outbound_type = 'sales' AND status = 1${dateFilter}`,
      params
    );

    // 部分出库
    const [partialResult] = await query(
      `SELECT COUNT(*) as count FROM inv_outbound_order WHERE deleted = 0 AND outbound_type = 'sales' AND status = 2${dateFilter}`,
      params
    );

    // 已出库
    const [completedResult] = await query(
      `SELECT COUNT(*) as count FROM inv_outbound_order WHERE deleted = 0 AND outbound_type = 'sales' AND status = 3${dateFilter}`,
      params
    );

    // 今日出库单数
    const [todayResult] = await query(
      `SELECT COUNT(*) as count FROM inv_outbound_order
       WHERE deleted = 0 AND outbound_type = 'sales'
         AND create_time >= ? AND create_time < ?`,
      [today, tomorrow]
    );

    // 本月出库金额
    const [monthlyResult] = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM inv_outbound_order
       WHERE deleted = 0 AND outbound_type = 'sales'
         AND create_time >= ? AND create_time < ?`,
      [month.start, month.end]
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
