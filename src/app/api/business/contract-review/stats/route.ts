import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';
import { currentMonthRange } from '@/lib/date-utils';

// 获取合同审核统计信息
// 修正说明：
//   1) 原表 `bus_contract` 在库中不存在 —— 合同评审真实表是 `biz_contract_review`
//      （字段：status / total_amount / review_date / final_result）；
//   2) 时间列是 `create_time`，统计不再用 YEAR()/MONTH() 包裹列。
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Business');
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

    // 待审核
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM biz_contract_review WHERE deleted = 0 AND status = 1${dateFilter}`,
      params
    );

    // 审核中
    const [reviewingResult] = await query(
      `SELECT COUNT(*) as count FROM biz_contract_review WHERE deleted = 0 AND status = 2${dateFilter}`,
      params
    );

    // 已通过
    const [approvedResult] = await query(
      `SELECT COUNT(*) as count FROM biz_contract_review WHERE deleted = 0 AND status = 3${dateFilter}`,
      params
    );

    // 已驳回
    const [rejectedResult] = await query(
      `SELECT COUNT(*) as count FROM biz_contract_review WHERE deleted = 0 AND status = 4${dateFilter}`,
      params
    );

    // 本月合同金额
    const [monthlyResult] = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM biz_contract_review
       WHERE deleted = 0 AND create_time >= ? AND create_time < ?`,
      [month.start, month.end]
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        reviewing: reviewingResult?.count || 0,
        approved: approvedResult?.count || 0,
        rejected: rejectedResult?.count || 0,
        monthlyAmount: Number(monthlyResult?.total) || 0,
      },
    });
  } catch (error) {
    console.error('Get contract review stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
