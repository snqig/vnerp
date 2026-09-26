import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';
import { currentMonthRange } from '@/lib/date-utils';

// 获取库存盘点统计信息
// 修正说明：
//   1) 原表 `wh_stocktaking` 在库中不存在 —— 盘点单真实表是 `inv_stocktaking`；
//   2) `wh_stocktaking.difference` 列在 inv_stocktaking 上不存在（差异在明细行 inv_stocktaking_item），
//      「差异待审批」改为统计明细中仍有差异且未处理的盘点单；
//   3) 时间列是 `create_time`，不再用 YEAR()/MONTH() 包裹列，改为月份区间。
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

    // 待盘点
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM inv_stocktaking WHERE deleted = 0 AND status = 1${dateFilter}`,
      params
    );

    // 盘点中
    const [countingResult] = await query(
      `SELECT COUNT(*) as count FROM inv_stocktaking WHERE deleted = 0 AND status = 2${dateFilter}`,
      params
    );

    // 已完成
    const [completedResult] = await query(
      `SELECT COUNT(*) as count FROM inv_stocktaking WHERE deleted = 0 AND status = 3${dateFilter}`,
      params
    );

    // 差异待审批（明细里有差异且仍未处理）
    const [differenceResult] = await query(
      `SELECT COUNT(DISTINCT i.taking_id) as count FROM inv_stocktaking_item i
       JOIN inv_stocktaking t ON t.id = i.taking_id
       WHERE t.deleted = 0 AND i.diff_qty <> 0 AND i.diff_status = 'pending'`
    );

    // 本月盘点次数
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM inv_stocktaking
       WHERE create_time >= ? AND create_time < ?`,
      [month.start, month.end]
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        counting: countingResult?.count || 0,
        completed: completedResult?.count || 0,
        difference: differenceResult?.count || 0,
        monthlyCount: monthlyResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get stocktaking stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
