import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取样品转量产统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Engineering');
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

    // 待转量产
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM eng_sample_to_mass WHERE deleted = 0 AND status = 1${dateFilter}`,
      params
    );

    // 转产中
    const [convertingResult] = await query(
      `SELECT COUNT(*) as count FROM eng_sample_to_mass WHERE deleted = 0 AND status = 2${dateFilter}`,
      params
    );

    // 已完成
    const [completedResult] = await query(
      `SELECT COUNT(*) as count FROM eng_sample_to_mass WHERE deleted = 0 AND status = 3${dateFilter}`,
      params
    );

    // 本月转产数
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM eng_sample_to_mass 
       WHERE deleted = 0 AND YEAR(create_time) = YEAR(CURDATE()) AND MONTH(create_time) = MONTH(CURDATE())`
    );

    // 转产成功率
    const [successResult] = await query(
      `SELECT COUNT(*) as count FROM eng_sample_to_mass WHERE deleted = 0 AND status = 3`
    );
    const [totalResult] = await query(
      `SELECT COUNT(*) as count FROM eng_sample_to_mass WHERE deleted = 0`
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        converting: convertingResult?.count || 0,
        completed: completedResult?.count || 0,
        monthlyCount: monthlyResult?.count || 0,
        successRate: totalResult?.count > 0 ? Math.round((successResult?.count / totalResult?.count) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('Get sample to mass stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
