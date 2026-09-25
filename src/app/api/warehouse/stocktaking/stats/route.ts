import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取库存盘点统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Warehouse');
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

    // 待盘点
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM wh_stocktaking WHERE deleted = 0 AND status = 1${dateFilter}`,
      params
    );

    // 盘点中
    const [countingResult] = await query(
      `SELECT COUNT(*) as count FROM wh_stocktaking WHERE deleted = 0 AND status = 2${dateFilter}`,
      params
    );

    // 已完成
    const [completedResult] = await query(
      `SELECT COUNT(*) as count FROM wh_stocktaking WHERE deleted = 0 AND status = 3${dateFilter}`,
      params
    );

    // 差异待审批
    const [differenceResult] = await query(
      `SELECT COUNT(*) as count FROM wh_stocktaking WHERE deleted = 0 AND status = 4 AND difference > 0`
    );

    // 本月盘点次数
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM wh_stocktaking 
       WHERE deleted = 0 AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        counting: countingResult?.count || 0,
        completed: completedResult?.count || 0,
        difference: differenceResult?.count || 0,
        monthlyCount: monthlyResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get stocktaking stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
