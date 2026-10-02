import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取来料检验统计信息（基于真实表 qc_incoming_inspection）
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
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
    // 入库单侧的日期过滤（待检验按入库单创建时间口径）
    let inboundDateFilter = '';
    const inboundParams: any[] = [];
    if (startDate && endDate) {
      inboundDateFilter = ' AND DATE(create_time) BETWEEN ? AND ?';
      inboundParams.push(startDate, endDate);
    }

    // pass / fail 按 inspection_result 统计
    const [passedResult] = await query(
      `SELECT COUNT(*) as count FROM qc_incoming_inspection WHERE deleted = 0 AND inspection_result = 'pass'${dateFilter}`,
      params
    );
    const [failedResult] = await query(
      `SELECT COUNT(*) as count FROM qc_incoming_inspection WHERE deleted = 0 AND inspection_result = 'fail'${dateFilter}`,
      params
    );
    // 检验中：检验单已创建但结果未出（pending 或 NULL；normalizeInspectionResult 保证新单写 pending）
    const [inspectingResult] = await query(
      `SELECT COUNT(*) as count FROM qc_incoming_inspection WHERE deleted = 0 AND (inspection_result = 'pending' OR inspection_result IS NULL)${dateFilter}`,
      params
    );
    // 待检验：入库单已审核进入待检状态（inspection_status=3）尚未挂检验单出结果
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM inv_inbound_order WHERE deleted = 0 AND inspection_status = 3${inboundDateFilter}`,
      inboundParams
    );
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM qc_incoming_inspection
       WHERE deleted = 0 AND YEAR(create_time) = YEAR(CURDATE()) AND MONTH(create_time) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        inspecting: inspectingResult?.count || 0,
        passed: passedResult?.count || 0,
        failed: failedResult?.count || 0,
        monthlyCount: monthlyResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get incoming stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
