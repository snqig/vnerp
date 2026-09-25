import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取质量追溯统计信息（基于真实表 inv_trace_record）
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Quality');
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

    // trace_type: forward/backward
    const [forwardResult] = await query(
      `SELECT COUNT(*) as count FROM inv_trace_record WHERE deleted = 0 AND trace_type = 'forward'${dateFilter}`,
      params
    );
    const [backwardResult] = await query(
      `SELECT COUNT(*) as count FROM inv_trace_record WHERE deleted = 0 AND trace_type = 'backward'${dateFilter}`,
      params
    );
    const [totalResult] = await query(
      `SELECT COUNT(*) as count FROM inv_trace_record WHERE deleted = 0${dateFilter}`,
      params
    );
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM inv_trace_record
       WHERE deleted = 0 AND YEAR(create_time) = YEAR(CURDATE()) AND MONTH(create_time) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        total: totalResult?.count || 0,
        forward: forwardResult?.count || 0,
        backward: backwardResult?.count || 0,
        monthlyCount: monthlyResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get quality trace stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
