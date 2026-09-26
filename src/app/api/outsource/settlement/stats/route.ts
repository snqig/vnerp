import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';
import { currentMonthRange } from '@/lib/date-utils';

// 获取外协结算统计信息
// 修正说明：
//   1) 原表 `out_settlement` 在库中不存在 —— 真实表是 `outsource_settlement`；
//   2) 该表没有 `total_amount` / `paid_amount` 列，对应字段是 `settlement_amount` 和 `payment_status`
//      （结算金额口径：settlement_amount − deduct_amount = actual_amount）；
//   3) 时间列是 `create_time`，统计不再用 YEAR()/MONTH() 包裹列。
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

    // 待结算
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM outsource_settlement WHERE deleted = 0 AND status = 1${dateFilter}`,
      params
    );

    // 结算中
    const [settlingResult] = await query(
      `SELECT COUNT(*) as count FROM outsource_settlement WHERE deleted = 0 AND status = 2${dateFilter}`,
      params
    );

    // 已结算
    const [settledResult] = await query(
      `SELECT COUNT(*) as count FROM outsource_settlement WHERE deleted = 0 AND status = 3${dateFilter}`,
      params
    );

    // 待付款
    const [unpaidResult] = await query(
      `SELECT COUNT(*) as count FROM outsource_settlement
       WHERE deleted = 0 AND status = 3 AND IFNULL(payment_status, '') <> 'paid'`
    );

    // 本月结算金额
    const [monthlyResult] = await query(
      `SELECT COALESCE(SUM(settlement_amount), 0) as total FROM outsource_settlement
       WHERE deleted = 0 AND create_time >= ? AND create_time < ?`,
      [month.start, month.end]
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        settling: settlingResult?.count || 0,
        settled: settledResult?.count || 0,
        unpaid: unpaidResult?.count || 0,
        monthlyAmount: Number(monthlyResult?.total) || 0,
      },
    });
  } catch (error) {
    console.error('Get outsource settlement stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
