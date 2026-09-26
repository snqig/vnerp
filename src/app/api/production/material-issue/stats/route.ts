import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';
import { currentMonthRange, toLocalDateStr } from '@/lib/date-utils';

// 获取生产发料统计信息
// 修正说明：
//   1) 原表 `prod_material_issue` 在库中不存在 —— 真实表是 `prd_material_issue`；
//   2) `prd_material_issue` 没有 `qty` 列，发料数量在明细表 `prd_material_issue_item.issued_qty`，
//      本月发料数量改为主表明细 JOIN 求和；
//   3) 时间列是 `create_time`，不再用 YEAR()/MONTH()/DATE() 包裹列，改为区间。
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Production');
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

    // 待发料
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM prd_material_issue WHERE deleted = 0 AND status = 1${dateFilter}`,
      params
    );

    // 部分发料
    const [partialResult] = await query(
      `SELECT COUNT(*) as count FROM prd_material_issue WHERE deleted = 0 AND status = 2${dateFilter}`,
      params
    );

    // 已发料
    const [completedResult] = await query(
      `SELECT COUNT(*) as count FROM prd_material_issue WHERE deleted = 0 AND status = 3${dateFilter}`,
      params
    );

    // 今日发料单数
    const [todayResult] = await query(
      `SELECT COUNT(*) as count FROM prd_material_issue
       WHERE deleted = 0 AND create_time >= ? AND create_time < ?`,
      [today, tomorrow]
    );

    // 本月发料数量（明细行求和）
    const [monthlyResult] = await query(
      `SELECT COALESCE(SUM(i.issued_qty), 0) as total FROM prd_material_issue p
       JOIN prd_material_issue_item i ON i.issue_id = p.id
       WHERE p.deleted = 0 AND p.create_time >= ? AND p.create_time < ?`,
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
    console.error('Get material issue stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
