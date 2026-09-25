import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取应收管理统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Finance');
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

    // 应收总额
    const [totalResult] = await query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM fin_receivable WHERE deleted = 0 AND status != 3${dateFilter}`,
      params
    );

    // 已收金额
    const [receivedResult] = await query(
      `SELECT COALESCE(SUM(received_amount), 0) as total FROM fin_receivable WHERE deleted = 0${dateFilter}`,
      params
    );

    // 未收金额
    const [unreceivedResult] = await query(
      `SELECT COALESCE(SUM(amount - COALESCE(received_amount, 0)), 0) as total 
       FROM fin_receivable WHERE deleted = 0 AND status != 3${dateFilter}`,
      params
    );

    // 逾期金额
    const [overdueResult] = await query(
      `SELECT COALESCE(SUM(amount - COALESCE(received_amount, 0)), 0) as total 
       FROM fin_receivable WHERE deleted = 0 AND status != 3 AND due_date < CURDATE()`,
      params
    );

    // 本月回款
    const [monthlyResult] = await query(
      `SELECT COALESCE(SUM(received_amount), 0) as total 
       FROM fin_receivable 
       WHERE deleted = 0 AND YEAR(updated_at) = YEAR(CURDATE()) AND MONTH(updated_at) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        totalReceivable: Number(totalResult?.total) || 0,
        receivedAmount: Number(receivedResult?.total) || 0,
        unreceivedAmount: Number(unreceivedResult?.total) || 0,
        overdueAmount: Number(overdueResult?.total) || 0,
        monthlyReceived: Number(monthlyResult?.total) || 0,
      },
    });
  } catch (error) {
    console.error('Get receivable stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
