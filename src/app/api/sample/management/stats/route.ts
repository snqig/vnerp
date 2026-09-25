import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取打样管理统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Sample');
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

    // 待打样
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM sample_order WHERE deleted = 0 AND status = 1${dateFilter}`,
      params
    );

    // 打样中
    const [samplingResult] = await query(
      `SELECT COUNT(*) as count FROM sample_order WHERE deleted = 0 AND status = 2${dateFilter}`,
      params
    );

    // 已完成
    const [completedResult] = await query(
      `SELECT COUNT(*) as count FROM sample_order WHERE deleted = 0 AND status = 3${dateFilter}`,
      params
    );

    // 客户确认中
    const [confirmingResult] = await query(
      `SELECT COUNT(*) as count FROM sample_order WHERE deleted = 0 AND status = 4${dateFilter}`,
      params
    );

    // 本月打样数
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM sample_order 
       WHERE deleted = 0 AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        sampling: samplingResult?.count || 0,
        completed: completedResult?.count || 0,
        confirming: confirmingResult?.count || 0,
        monthlyCount: monthlyResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get sample management stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
