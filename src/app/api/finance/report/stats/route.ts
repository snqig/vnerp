import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';
import { currentMonthRange } from '@/lib/date-utils';

// 获取财务报表统计信息
// 修正说明：
//   1) `fin_payment` 表不存在，收/付款的真实载体是 fin_receipt_record（收）/ fin_payment_record（付）；
//      这两张表没有 type 列，收入/支出靠「表本身」区分，不再用 type='in'/'out'；
//   2) fin_receivable / fin_payable 没有 total_amount 列，金额列为 amount；
//   3) 不使用 YEAR()/MONTH() 包裹列，改用月份区间。
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Finance');
  try {
    const { start, end } = currentMonthRange();
    const monthRangeParams = [start, end];

    // 本月收入（收款单）
    const [incomeRows] = await query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM fin_receipt_record
       WHERE deleted = 0 AND receipt_date >= ? AND receipt_date < ?`,
      monthRangeParams
    );

    // 本月支出（付款单）
    const [expenseRows] = await query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM fin_payment_record
       WHERE deleted = 0 AND payment_date >= ? AND payment_date < ?`,
      monthRangeParams
    );

    // 应收总额
    const [receivableRows] = await query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM fin_receivable WHERE deleted = 0 AND status != 3`
    );

    // 应付总额
    const [payableRows] = await query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM fin_payable WHERE deleted = 0 AND status != 3`
    );

    // 本月利润 = 本月收款 − 本月付款
    const income = Number(incomeRows?.total) || 0;
    const expense = Number(expenseRows?.total) || 0;

    return NextResponse.json({
      success: true,
      data: {
        monthlyIncome: income,
        monthlyExpense: expense,
        receivable: Number(receivableRows?.total) || 0,
        payable: Number(payableRows?.total) || 0,
        monthlyProfit: income - expense,
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
