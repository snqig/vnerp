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
      dateFilter = ' AND DATE(r.create_time) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    // 待保养：激活计划中 next_execute_date <= 今天（即将到期或刚好到期）
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM eqp_maintenance_plan p
       WHERE p.deleted = 0 AND p.status = 1
         AND (p.next_execute_date IS NULL OR p.next_execute_date <= CURDATE())`
    );

    // 保养中：已创建记录、已开始（start_time 有值）、但未完成（result IS NULL 或 result = 'partial'）
    const [maintainingResult] = await query(
      `SELECT COUNT(*) as count FROM eqp_maintenance_record r
       WHERE r.deleted = 0
         AND r.start_time IS NOT NULL
         AND (r.result IS NULL OR r.result = 'partial')${dateFilter}`,
      params
    );

    // 已完成：result = 'completed'
    const [completedResult] = await query(
      `SELECT COUNT(*) as count FROM eqp_maintenance_record r
       WHERE r.deleted = 0 AND r.result = 'completed'${dateFilter}`,
      params
    );

    // 逾期未保养：激活计划 next_execute_date < 今天（严格逾期）
    const [overdueResult] = await query(
      `SELECT COUNT(*) as count FROM eqp_maintenance_plan p
       WHERE p.deleted = 0 AND p.status = 1
         AND p.next_execute_date < CURDATE()`
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
