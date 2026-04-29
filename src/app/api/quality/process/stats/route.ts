import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取品质检验统计
export async function GET(request: NextRequest) {
  try {
    // 待检验数量（已排产和生产的）
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM prd_process_card WHERE deleted = 0 AND burdening_status IN (1, 2)`
    );

    // 检验中数量
    const [inspectingResult] = await query(
      `SELECT COUNT(*) as count FROM prd_process_card WHERE deleted = 0 AND burdening_status = 2`
    );

    // 检验合格数量
    const [passedResult] = await query(
      `SELECT COUNT(*) as count FROM prd_process_card WHERE deleted = 0 AND burdening_status = 3`
    );

    // 今日检验数量
    const [todayResult] = await query(
      `SELECT COUNT(*) as count 
       FROM inv_trace_record 
       WHERE DATE(create_time) = CURDATE()`
    );

    // 本周检验数量
    const [weekResult] = await query(
      `SELECT COUNT(*) as count 
       FROM inv_trace_record 
       WHERE create_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult.count,
        inspecting: inspectingResult.count,
        passed: passedResult.count,
        today: todayResult.count,
        week: weekResult.count,
      },
    });
  } catch (error) {
    console.error('获取品质统计失败:', error);
    return NextResponse.json(
      { success: false, message: '获取品质统计失败' },
      { status: 500 }
    );
  }
}
