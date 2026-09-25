import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取生产发料统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Production');
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

    // 待发料
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM prod_material_issue WHERE deleted = 0 AND status = 1${dateFilter}`,
      params
    );

    // 部分发料
    const [partialResult] = await query(
      `SELECT COUNT(*) as count FROM prod_material_issue WHERE deleted = 0 AND status = 2${dateFilter}`,
      params
    );

    // 已发料
    const [completedResult] = await query(
      `SELECT COUNT(*) as count FROM prod_material_issue WHERE deleted = 0 AND status = 3${dateFilter}`,
      params
    );

    // 今日发料单数
    const [todayResult] = await query(
      `SELECT COUNT(*) as count FROM prod_material_issue 
       WHERE deleted = 0 AND DATE(created_at) = CURDATE()`
    );

    // 本月发料数量
    const [monthlyResult] = await query(
      `SELECT COALESCE(SUM(qty), 0) as total FROM prod_material_issue 
       WHERE deleted = 0 AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        partial: partialResult?.count || 0,
        completed: completedResult?.count || 0,
        todayCount: todayResult?.count || 0,
        monthlyQty: Number(monthlyResult?.total) || 0,
      },
    });
  } catch (error) {
    console.error('Get material issue stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
