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

    // pass / fail 按 inspection_result 统计
    const [passedResult] = await query(
      `SELECT COUNT(*) as count FROM qc_incoming_inspection WHERE deleted = 0 AND inspection_result = 'pass'${dateFilter}`,
      params
    );
    const [failedResult] = await query(
      `SELECT COUNT(*) as count FROM qc_incoming_inspection WHERE deleted = 0 AND inspection_result = 'fail'${dateFilter}`,
      params
    );
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM qc_incoming_inspection WHERE deleted = 0 AND inspection_result IS NULL${dateFilter}`,
      params
    );
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM qc_incoming_inspection
       WHERE deleted = 0 AND YEAR(create_time) = YEAR(CURDATE()) AND MONTH(create_time) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        inspecting: 0,
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
