import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取采购订单统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Purchase');
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

    // 待下单（草稿 10）
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM pur_purchase_order WHERE deleted = 0 AND status = 10${dateFilter}`,
      params
    );

    // 已下单（已提交 20 / 已审核 30）
    const [orderedResult] = await query(
      `SELECT COUNT(*) as count FROM pur_purchase_order WHERE deleted = 0 AND status IN (20, 30)${dateFilter}`,
      params
    );

    // 部分到货（40）
    const [partialResult] = await query(
      `SELECT COUNT(*) as count FROM pur_purchase_order WHERE deleted = 0 AND status = 40${dateFilter}`,
      params
    );

    // 已完成（50）
    const [completedResult] = await query(
      `SELECT COUNT(*) as count FROM pur_purchase_order WHERE deleted = 0 AND status = 50${dateFilter}`,
      params
    );

    // 本月采购额
    const [monthlyResult] = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total
       FROM pur_purchase_order
       WHERE deleted = 0 AND YEAR(create_time) = YEAR(CURDATE()) AND MONTH(create_time) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        ordered: orderedResult?.count || 0,
        partial: partialResult?.count || 0,
        completed: completedResult?.count || 0,
        monthlyAmount: Number(monthlyResult?.total) || 0,
      },
    });
  } catch (error) {
    console.error('Get purchase orders stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
