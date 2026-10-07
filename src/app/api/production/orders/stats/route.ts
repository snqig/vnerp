import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取生产订单统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Production');
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateFilter = '';
    const params: any[] = [];

    if (startDate && endDate) {
      dateFilter = ' AND DATE(create_time) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    // 待开工
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM prod_work_order WHERE deleted = 0 AND status = 'pending'${dateFilter}`,
      params
    );

    // 生产中
    const [producingResult] = await query(
      `SELECT COUNT(*) as count FROM prod_work_order WHERE deleted = 0 AND status = 'in_progress'${dateFilter}`,
      params
    );

    // 已完成
    const [completedResult] = await query(
      `SELECT COUNT(*) as count FROM prod_work_order WHERE deleted = 0 AND status = 'completed'${dateFilter}`,
      params
    );

    // 已延期
    const [delayedResult] = await query(
      `SELECT COUNT(*) as count FROM prod_work_order WHERE deleted = 0 AND status IN ('pending', 'in_progress') AND plan_end_date < CURDATE()${dateFilter}`,
      params
    );

    // 今日产量（今日完成的工单数量）
    const [todayResult] = await query(
      `SELECT COUNT(*) as count FROM prod_work_order
       WHERE deleted = 0 AND status = 'completed' AND DATE(update_time) = CURDATE()`
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        producing: producingResult?.count || 0,
        completed: completedResult?.count || 0,
        delayed: delayedResult?.count || 0,
        todayOutput: todayResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get production orders stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
