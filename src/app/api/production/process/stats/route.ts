import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取生产流程统计
export async function GET(request: NextRequest) {
  try {
    // 各状态数量统计
    const [scheduledResult] = await query(
      `SELECT COUNT(*) as count FROM prd_process_card WHERE deleted = 0 AND burdening_status = 1`
    );

    const [producingResult] = await query(
      `SELECT COUNT(*) as count FROM prd_process_card WHERE deleted = 0 AND burdening_status = 2`
    );

    const [completedResult] = await query(
      `SELECT COUNT(*) as count FROM prd_process_card WHERE deleted = 0 AND burdening_status = 3`
    );

    // 今日生产数量
    const [todayResult] = await query(
      `SELECT COALESCE(SUM(plan_qty), 0) as total 
       FROM prd_process_card 
       WHERE deleted = 0 AND burdening_status >= 1 
       AND work_order_date = CURDATE()`
    );

    // 本周生产数量
    const [weekResult] = await query(
      `SELECT COALESCE(SUM(plan_qty), 0) as total 
       FROM prd_process_card 
       WHERE deleted = 0 AND burdening_status >= 1 
       AND work_order_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`
    );

    // 各工序统计
    const processStats = await query(
      `SELECT 
        burdening_status as status,
        COUNT(*) as count,
        SUM(plan_qty) as totalQty
      FROM prd_process_card 
      WHERE deleted = 0 AND burdening_status >= 1
      GROUP BY burdening_status`
    );

    return NextResponse.json({
      success: true,
      data: {
        scheduled: scheduledResult.count,
        producing: producingResult.count,
        completed: completedResult.count,
        todayQty: todayResult.total,
        weekQty: weekResult.total,
        processStats,
      },
    });
  } catch (error) {
    console.error('获取流程统计失败:', error);
    return NextResponse.json(
      { success: false, message: '获取流程统计失败' },
      { status: 500 }
    );
  }
}
