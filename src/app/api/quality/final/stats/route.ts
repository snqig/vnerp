import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取终检统计
export async function GET(request: NextRequest) {
  try {
    // 待终检数量（生产中的）
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM prd_process_card WHERE deleted = 0 AND burdening_status = 2`
    );

    // 终检中数量
    const [inspectingResult] = await query(
      `SELECT COUNT(*) as count FROM prd_process_card WHERE deleted = 0 AND burdening_status = 2`
    );

    // 终检合格数量
    const [passedResult] = await query(
      `SELECT COUNT(*) as count FROM prd_process_card WHERE deleted = 0 AND burdening_status = 3`
    );

    // 今日终检数量
    const [todayResult] = await query(
      `SELECT COUNT(*) as count 
       FROM inv_trace_record 
       WHERE trace_type = 9 AND DATE(create_time) = CURDATE()`
    );

    // 本周终检数量
    const [weekResult] = await query(
      `SELECT COUNT(*) as count 
       FROM inv_trace_record 
       WHERE trace_type = 9 AND create_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`
    );

    // 合格率统计
    const [passRateResult] = await query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN burdening_status = 3 THEN 1 ELSE 0 END) as passed
      FROM prd_process_card 
      WHERE deleted = 0 AND burdening_status >= 2`
    );

    const passRate = passRateResult.total > 0 
      ? Math.round((passRateResult.passed / passRateResult.total) * 100) 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult.count,
        inspecting: inspectingResult.count,
        passed: passedResult.count,
        today: todayResult.count,
        week: weekResult.count,
        passRate,
      },
    });
  } catch (error) {
    console.error('获取终检统计失败:', error);
    return NextResponse.json(
      { success: false, message: '获取终检统计失败' },
      { status: 500 }
    );
  }
}
