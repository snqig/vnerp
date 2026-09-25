import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取客诉管理统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Quality');
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateFilter = '';
    const params: any[] = [];

    if (startDate && endDate) {
      dateFilter = ' AND DATE(created_at) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    // 待处理（表名/日期列对齐 qms_complaint 真实 schema：create_time）
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM qms_complaint WHERE deleted = 0 AND status = 1${dateFilter}`,
      params
    );

    // 处理中
    const [processingResult] = await query(
      `SELECT COUNT(*) as count FROM qms_complaint WHERE deleted = 0 AND status = 2${dateFilter}`,
      params
    );

    // 已解决
    const [resolvedResult] = await query(
      `SELECT COUNT(*) as count FROM qms_complaint WHERE deleted = 0 AND status = 3${dateFilter}`,
      params
    );

    // 已关闭
    const [closedResult] = await query(
      `SELECT COUNT(*) as count FROM qms_complaint WHERE deleted = 0 AND status = 4${dateFilter}`,
      params
    );

    // 本月客诉数
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM qms_complaint
       WHERE deleted = 0 AND YEAR(create_time) = YEAR(CURDATE()) AND MONTH(create_time) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        processing: processingResult?.count || 0,
        resolved: resolvedResult?.count || 0,
        closed: closedResult?.count || 0,
        monthlyCount: monthlyResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get complaint stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
