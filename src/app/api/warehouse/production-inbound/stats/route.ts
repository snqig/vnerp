import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';
import { currentMonthRange, toLocalDateStr } from '@/lib/date-utils';

// 获取生产入库统计信息
// 修正说明：
//   1) 原表 `wh_inbound_order` 在库中不存在 —— 通用入库单是 `inv_inbound_order`（业务类型是 purchase/other），
//      而**生产入库**的专用表是 `inv_production_inbound`；该表没有 `type` 列，也不需要按 type 过滤；
//   2) 时间列是 `create_time`，不再用 YEAR()/MONTH()/DATE() 包裹列，改为半开区间；
//   3) `wh_inbound_order.total_qty` 在 inv_production_inbound 上不存在（明细数量在
//      inv_production_inbound_item.quantity），本月数量改为主表明细 JOIN 求和。
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

    // 待入库
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM inv_production_inbound WHERE deleted = 0 AND status = 1${dateFilter}`,
      params
    );

    // 部分入库
    const [partialResult] = await query(
      `SELECT COUNT(*) as count FROM inv_production_inbound WHERE deleted = 0 AND status = 2${dateFilter}`,
      params
    );

    // 已入库
    const [completedResult] = await query(
      `SELECT COUNT(*) as count FROM inv_production_inbound WHERE deleted = 0 AND status = 3${dateFilter}`,
      params
    );

    // 今日入库单数
    const [todayResult] = await query(
      `SELECT COUNT(*) as count FROM inv_production_inbound
       WHERE deleted = 0 AND create_time >= ? AND create_time < ?`,
      [today, tomorrow]
    );

    // 本月入库数量（明细行求和）
    const [monthlyResult] = await query(
      `SELECT COALESCE(SUM(i.quantity), 0) as total FROM inv_production_inbound p
       JOIN inv_production_inbound_item i ON i.inbound_id = p.id
       WHERE p.deleted = 0 AND p.status = 3
         AND p.create_time >= ? AND p.create_time < ?`,
      [month.start, month.end]
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
