import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取不合格品统计信息（基于真实表 qc_unqualified）
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

    // handle_status: 1=待处理 2=处理中 3=已处理 4=已关闭
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM qc_unqualified WHERE deleted = 0 AND handle_status = 1${dateFilter}`,
      params
    );
    const [processingResult] = await query(
      `SELECT COUNT(*) as count FROM qc_unqualified WHERE deleted = 0 AND handle_status = 2${dateFilter}`,
      params
    );
    const [processedResult] = await query(
      `SELECT COUNT(*) as count FROM qc_unqualified WHERE deleted = 0 AND handle_status = 3${dateFilter}`,
      params
    );
    const [closedResult] = await query(
      `SELECT COUNT(*) as count FROM qc_unqualified WHERE deleted = 0 AND handle_status = 4${dateFilter}`,
      params
    );
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM qc_unqualified
       WHERE deleted = 0 AND YEAR(create_time) = YEAR(CURDATE()) AND MONTH(create_time) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        processing: processingResult?.count || 0,
        processed: processedResult?.count || 0,
        closed: closedResult?.count || 0,
        monthlyCount: monthlyResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get unqualified stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
