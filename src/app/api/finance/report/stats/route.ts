import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取财务报表统计信息
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

    // 本月收入
    const [incomeResult] = await query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM fin_payment 
       WHERE deleted = 0 AND type = 'in' AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())`
    );

    // 本月支出
    const [expenseResult] = await query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM fin_payment 
       WHERE deleted = 0 AND type = 'out' AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())`
    );

    // 应收总额
    const [receivableResult] = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM fin_receivable WHERE deleted = 0 AND status != 3`
    );

    // 应付总额
    const [payableResult] = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM fin_payable WHERE deleted = 0 AND status != 3`
    );

    // 本月利润
    const [profitResult] = await query(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END), 0) - 
        COALESCE(SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END) as total 
       FROM fin_payment 
       WHERE deleted = 0 AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        monthlyIncome: Number(incomeResult?.total) || 0,
        monthlyExpense: Number(expenseResult?.total) || 0,
        receivable: Number(receivableResult?.total) || 0,
        payable: Number(payableResult?.total) || 0,
        monthlyProfit: Number(profitResult?.total) || 0,
      },
    });
  } catch (error) {
    console.error('Get report stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
