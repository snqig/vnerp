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

    // 油墨记录总数（基于 ink_opening_record）
    const [totalResult] = await query(
      `SELECT COUNT(*) as count FROM ink_opening_record WHERE deleted = 0${dateFilter}`,
      params
    );

    // 使用中（status=1 且未过期）
    const [enoughResult] = await query(
      `SELECT COUNT(*) as count FROM ink_opening_record WHERE deleted = 0 AND status = 1 AND (expire_time IS NULL OR expire_time > NOW())${dateFilter}`,
      params
    );

    // 已过期预警（status=1 但已过期）
    const [warningResult] = await query(
      `SELECT COUNT(*) as count FROM ink_opening_record WHERE deleted = 0 AND status = 1 AND expire_time IS NOT NULL AND expire_time < NOW()`
    );

    // 已报废（status=3）
    const [lowResult] = await query(
      `SELECT COUNT(*) as count FROM ink_opening_record WHERE deleted = 0 AND status = 3`
    );

    // 本月开罐量（按开罐时间统计）
    const [monthlyResult] = await query(
      `SELECT COALESCE(COUNT(*), 0) as total FROM ink_opening_record
       WHERE deleted = 0 AND YEAR(open_time) = YEAR(CURDATE()) AND MONTH(open_time) = MONTH(CURDATE())`
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
