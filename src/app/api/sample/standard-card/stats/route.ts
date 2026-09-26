import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';
import { currentMonthRange } from '@/lib/date-utils';

// 获取标准卡统计信息
// 修正说明：
//   1) 原表 `sample_standard_card` / `sample_standard_card_version` 在库中都不存在 ——
//      标准卡真实表是 `prd_standard_card`，版本信息直接落在它的 `version` 列上；
//   2) 时间列是 `create_time`，统计不再用 YEAR()/MONTH() 包裹列。
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Sample');
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

    // 标准卡总数
    const [totalResult] = await query(
      `SELECT COUNT(*) as count FROM prd_standard_card WHERE deleted = 0${dateFilter}`,
      params
    );

    // 已启用
    const [activeResult] = await query(
      `SELECT COUNT(*) as count FROM prd_standard_card WHERE deleted = 0 AND status = 1${dateFilter}`,
      params
    );

    // 已停用
    const [inactiveResult] = await query(
      `SELECT COUNT(*) as count FROM prd_standard_card WHERE deleted = 0 AND status = 0${dateFilter}`,
      params
    );

    // 本月新增
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM prd_standard_card
       WHERE create_time >= ? AND create_time < ?`,
      [month.start, month.end]
    );

    // 有版本的标准卡数
    const [versionResult] = await query(
      `SELECT COUNT(DISTINCT version) as count FROM prd_standard_card
       WHERE deleted = 0 AND version IS NOT NULL AND version <> ''`
    );

    return NextResponse.json({
      success: true,
      data: {
        total: totalResult?.count || 0,
        active: activeResult?.count || 0,
        inactive: inactiveResult?.count || 0,
        monthlyNew: monthlyResult?.count || 0,
        withVersion: versionResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get standard card stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
