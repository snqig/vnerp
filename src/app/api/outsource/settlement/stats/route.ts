import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取外协结算统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Outsource');
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

    // 待结算
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM out_settlement WHERE deleted = 0 AND status = 1${dateFilter}`,
      params
    );

    // 结算中
    const [settlingResult] = await query(
      `SELECT COUNT(*) as count FROM out_settlement WHERE deleted = 0 AND status = 2${dateFilter}`,
      params
    );

    // 已结算
    const [settledResult] = await query(
      `SELECT COUNT(*) as count FROM out_settlement WHERE deleted = 0 AND status = 3${dateFilter}`,
      params
    );

    // 待付款
    const [unpaidResult] = await query(
      `SELECT COUNT(*) as count FROM out_settlement WHERE deleted = 0 AND status = 3 AND paid_amount < total_amount`
    );

    // 本月结算金额
    const [monthlyResult] = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM out_settlement 
       WHERE deleted = 0 AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        settling: settlingResult?.count || 0,
        settled: settledResult?.count || 0,
        unpaid: unpaidResult?.count || 0,
        monthlyAmount: Number(monthlyResult?.total) || 0,
      },
    });
  } catch (error) {
    console.error('Get outsource settlement stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
