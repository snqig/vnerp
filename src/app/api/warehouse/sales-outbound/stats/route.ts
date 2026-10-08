import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';
import { currentMonthRange, toLocalDateStr } from '@/lib/date-utils';

/**
 * 销售出库统计卡片逻辑
 *
 * DB `inv_outbound_order` 字段说明：
 *   outbound_type: VARCHAR — 'sales' | 'production' | 'return' | 'transfer' | 'other'
 *   status: VARCHAR(20) — 业务状态
 *     draft (草稿) / pending (待出库) / completed (已出库) / cancelled (已取消)
 *
 * ⚠️ 注意：此表 status 是 VARCHAR，不是 TINYINT！
 *   旧代码用 status = 1/2/3 数字比较 → 全部返回 0。
 */
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const month = currentMonthRange();
    const today = toLocalDateStr();
    const tomorrow = toLocalDateStr(new Date(Date.now() + 24 * 3600 * 1000));

    const dateFilter =
      startDate && endDate
        ? ' AND create_time >= ? AND create_time <= ?'
        : '';
    const dateParams =
      startDate && endDate ? [startDate, `${endDate} 23:59:59`] : [];

    const baseWhere = `FROM inv_outbound_order WHERE deleted = 0 AND outbound_type = 'sales'${dateFilter}`;

    const [[pending], [partial], [completed], [todayResult], [monthly]] =
      await Promise.all([
        // 待出库：草稿 + 待出库
        query(
          `SELECT COUNT(*) as count ${baseWhere} AND status IN ('draft', 'pending')`,
          dateParams
        ),
        // 部分出库：inv_outbound_order 没有独立"部分"状态，
        // 用 quantity < total_quantity 的行来近似（若存在），否则为 0
        query(
          `SELECT COUNT(*) as count ${baseWhere} AND status NOT IN ('completed', 'cancelled')`,
          dateParams
        ),
        // 已出库
        query(
          `SELECT COUNT(*) as count ${baseWhere} AND status = 'completed'`,
          dateParams
        ),
        // 今日出库单数
        query(
          `SELECT COUNT(*) as count FROM inv_outbound_order
           WHERE deleted = 0 AND outbound_type = 'sales' AND status = 'completed'
             AND create_time >= ? AND create_time < ?`,
          [today, tomorrow]
        ),
        // 本月出库金额
        query(
          `SELECT COALESCE(SUM(total_amount), 0) as total FROM inv_outbound_order
           WHERE deleted = 0 AND outbound_type = 'sales' AND status = 'completed'
             AND create_time >= ? AND create_time < ?`,
          [month.start, month.end]
        ),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        pending: (pending as any)?.[0]?.count || 0,
        partial: (partial as any)?.[0]?.count || 0,
        completed: (completed as any)?.[0]?.count || 0,
        todayCount: (todayResult as any)?.[0]?.count || 0,
        monthlyAmount: Number((monthly as any)?.[0]?.total) || 0,
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
