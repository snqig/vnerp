import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';
import { currentMonthRange } from '@/lib/date-utils';

// 获取库存调整统计信息
// 修正说明：
//   1) 原表 `wh_stock_adjust` 在库中不存在 —— 真实表是 `inv_stock_adjust`；
//   2) 时间列是 `create_time`，不再用 YEAR()/MONTH()/DATE() 包裹列，改为月份区间。
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Warehouse');
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

    // 待审批
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM inv_stock_adjust WHERE deleted = 0 AND status = 1${dateFilter}`,
      params
    );

    // 已审批
    const [approvedResult] = await query(
      `SELECT COUNT(*) as count FROM inv_stock_adjust WHERE deleted = 0 AND status = 2${dateFilter}`,
      params
    );

    // 已执行
    const [executedResult] = await query(
      `SELECT COUNT(*) as count FROM inv_stock_adjust WHERE deleted = 0 AND status = 3${dateFilter}`,
      params
    );

    // 已驳回
    const [rejectedResult] = await query(
      `SELECT COUNT(*) as count FROM inv_stock_adjust WHERE deleted = 0 AND status = 4${dateFilter}`,
      params
    );

    // 本月调整单数
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM inv_stock_adjust
       WHERE create_time >= ? AND create_time < ?`,
      [month.start, month.end]
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        approved: approvedResult?.count || 0,
        executed: executedResult?.count || 0,
        rejected: rejectedResult?.count || 0,
        monthlyCount: monthlyResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get stock adjust stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
