import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取设备保养统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Equipment');
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

    // 待保养：result IS NULL OR end_time IS NULL
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM eqp_maintenance_record WHERE deleted = 0 AND (result IS NULL OR end_time IS NULL)${dateFilter}`,
      params
    );

    // 保养中：result IS NULL AND end_time IS NOT NULL
    const [maintainingResult] = await query(
      `SELECT COUNT(*) as count FROM eqp_maintenance_record WHERE deleted = 0 AND result IS NULL AND end_time IS NOT NULL${dateFilter}`,
      params
    );

    // 已完成：result = 'completed'
    const [completedResult] = await query(
      `SELECT COUNT(*) as count FROM eqp_maintenance_record WHERE deleted = 0 AND result = 'completed'${dateFilter}`,
      params
    );

    // 逾期未保养：result IS NULL AND DATE(end_time) < CURDATE()
    const [overdueResult] = await query(
      `SELECT COUNT(*) as count FROM eqp_maintenance_record
       WHERE deleted = 0 AND result IS NULL AND DATE(end_time) < CURDATE()`
    );

    // 保养计划总数
    const [planResult] = await query(
      `SELECT COUNT(*) as count FROM eqp_maintenance_plan WHERE deleted = 0`
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        maintaining: maintainingResult?.count || 0,
        completed: completedResult?.count || 0,
        overdue: overdueResult?.count || 0,
        planCount: planResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get maintenance stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
