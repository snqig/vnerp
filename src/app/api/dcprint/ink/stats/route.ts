import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query, type SqlValue } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取油墨管理统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Dcprint');
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateFilter = '';
    const params: SqlValue[] = [];

    if (startDate && endDate) {
      dateFilter = ' AND DATE(open_time) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    // 油墨记录总数（基于 prd_ink 油墨基础表）
    const [totalResult] = await query(
      `SELECT COUNT(*) as count FROM prd_ink WHERE deleted = 0`
    );

    // 库存充足（stock_qty > safety_stock）
    const [enoughResult] = await query(
      `SELECT COUNT(*) as count FROM prd_ink WHERE deleted = 0 AND stock_qty > safety_stock`
    );

    // 库存预警（stock_qty = safety_stock）
    const [warningResult] = await query(
      `SELECT COUNT(*) as count FROM prd_ink WHERE deleted = 0 AND stock_qty = safety_stock`
    );

    // 库存不足（stock_qty < safety_stock）
    const [lowResult] = await query(
      `SELECT COUNT(*) as count FROM prd_ink WHERE deleted = 0 AND stock_qty < safety_stock`
    );

    // 本月入库量（暂时从开罐记录统计，后续可以改成入库单统计）
    const [monthlyResult] = await query(
      `SELECT COALESCE(COUNT(*), 0) as total FROM ink_opening_record WHERE deleted = 0 AND YEAR(open_time) = YEAR(CURDATE()) AND MONTH(open_time) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        total: (totalResult as { count: number }[])[0]?.count || 0,
        enough: (enoughResult as { count: number }[])[0]?.count || 0,
        warning: (warningResult as { count: number }[])[0]?.count || 0,
        low: (lowResult as { count: number }[])[0]?.count || 0,
        monthlyInQty: (monthlyResult as { total: number }[])[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error('Get ink stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
