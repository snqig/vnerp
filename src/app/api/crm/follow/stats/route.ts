import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';
import { currentMonthRange } from '@/lib/date-utils';

// 获取CRM跟进统计信息
// 修正说明：
//   1) 原表 `crm_follow_up` 在库中不存在 —— 库中两张跟进记录表：
//      `crm_customer_follow_up`（无 status 列）与 `crm_follow_record`（有 status/next_follow_date）。
//      这里选 `crm_follow_record`，因为状态机（跟进中/已转化/已流失）依赖它的 status 列；
//   2) 时间列是 `create_time`，统计不再用 YEAR()/MONTH() 包裹列。
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('CRM');
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

    // 待跟进
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM crm_follow_record
       WHERE deleted = 0 AND status = 1 AND next_follow_date <= CURDATE()${dateFilter}`,
      params
    );

    // 跟进中
    const [followingResult] = await query(
      `SELECT COUNT(*) as count FROM crm_follow_record WHERE deleted = 0 AND status = 2${dateFilter}`,
      params
    );

    // 已转化
    const [convertedResult] = await query(
      `SELECT COUNT(*) as count FROM crm_follow_record WHERE deleted = 0 AND status = 3${dateFilter}`,
      params
    );

    // 已流失
    const [lostResult] = await query(
      `SELECT COUNT(*) as count FROM crm_follow_record WHERE deleted = 0 AND status = 4${dateFilter}`,
      params
    );

    // 本月跟进次数
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM crm_follow_record
       WHERE create_time >= ? AND create_time < ?`,
      [month.start, month.end]
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        following: followingResult?.count || 0,
        converted: convertedResult?.count || 0,
        lost: lostResult?.count || 0,
        monthlyCount: monthlyResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get CRM follow stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
