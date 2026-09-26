import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取设备维修统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Equipment');
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

    // 待维修：status = 1
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM eqp_repair WHERE deleted = 0 AND status = 1${dateFilter}`,
      params
    );

    // 维修中：status = 2
    const [repairingResult] = await query(
      `SELECT COUNT(*) as count FROM eqp_repair WHERE deleted = 0 AND status = 2${dateFilter}`,
      params
    );

    // 已完成：status = 3
    const [completedResult] = await query(
      `SELECT COUNT(*) as count FROM eqp_repair WHERE deleted = 0 AND status = 3${dateFilter}`,
      params
    );

    // 本月维修数
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM eqp_repair
       WHERE deleted = 0 AND YEAR(create_time) = YEAR(CURDATE()) AND MONTH(create_time) = MONTH(CURDATE())`
    );

    // 维修费用总计
    const [costResult] = await query(
      `SELECT COALESCE(SUM(COALESCE(repair_cost, 0)), 0) as total FROM eqp_repair
       WHERE deleted = 0 AND YEAR(create_time) = YEAR(CURDATE()) AND MONTH(create_time) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        repairing: repairingResult?.count || 0,
        completed: completedResult?.count || 0,
        monthlyCount: monthlyResult?.count || 0,
        monthlyCost: Number(costResult?.total) || 0,
      },
    });
  } catch (error) {
    console.error('Get repair stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
