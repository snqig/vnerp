import { getTranslations } from 'next-intl/server';

;
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取品质检验统计
export const GET = withPermission(async (_request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  try {
    // 待过程检验数量（burdening_status=1：已配料待过程检）
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM prd_process_card WHERE deleted = 0 AND burdening_status = 1`
    );

    // 过程检验中数量（过程检无独立「检验中」状态：1=待检 → 2=已通过过程检）
    const [inspectingResult] = await query(
      `SELECT COUNT(*) as count FROM prd_process_card WHERE deleted = 0 AND burdening_status = 2`
    );

    // 过程检验合格数量（burdening_status=2 表示过程检已通过）
    // 注意：status 3 是终检完成，已不属于过程检验范畴，故不计入过程检验「合格」。
    const [passedResult] = await query(
      `SELECT COUNT(*) as count FROM prd_process_card WHERE deleted = 0 AND burdening_status = 2`
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
  } catch {
    return NextResponse.json({ success: false, message: ts('k_bvu033') }, { status: 500 });
  }
});
