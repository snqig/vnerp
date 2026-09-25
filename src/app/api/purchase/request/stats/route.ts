import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取采购申请统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Purchase');
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

    // 待审批
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM purchase_request WHERE deleted = 0 AND status = 1${dateFilter}`,
      params
    );

    // 已审批
    const [approvedResult] = await query(
      `SELECT COUNT(*) as count FROM purchase_request WHERE deleted = 0 AND status = 2${dateFilter}`,
      params
    );

    // 已驳回
    const [rejectedResult] = await query(
      `SELECT COUNT(*) as count FROM purchase_request WHERE deleted = 0 AND status = 3${dateFilter}`,
      params
    );

    // 已转订单
    const [orderedResult] = await query(
      `SELECT COUNT(*) as count FROM purchase_request WHERE deleted = 0 AND status = 4${dateFilter}`,
      params
    );

    // 本月申请金额
    const [monthlyResult] = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM purchase_request 
       WHERE deleted = 0 AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        approved: approvedResult?.count || 0,
        rejected: rejectedResult?.count || 0,
        ordered: orderedResult?.count || 0,
        monthlyAmount: Number(monthlyResult?.total) || 0,
      },
    });
  } catch (error) {
    console.error('Get purchase request stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
