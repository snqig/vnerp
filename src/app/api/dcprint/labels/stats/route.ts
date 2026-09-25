import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query, type SqlValue } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取标签管理统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Dcprint');
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateFilter = '';
    const params: SqlValue[] = [];

    if (startDate && endDate) {
      dateFilter = ' AND DATE(receive_date) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    // 标签总数（inv_material_label）
    const [totalResult] = await query(
      `SELECT COUNT(*) as count FROM inv_material_label WHERE deleted = 0${dateFilter}`,
      params
    );

    // 已启用（status=1）
    const [activeResult] = await query(
      `SELECT COUNT(*) as count FROM inv_material_label WHERE deleted = 0 AND status = 1${dateFilter}`,
      params
    );

    // 已停用（status=0）
    const [inactiveResult] = await query(
      `SELECT COUNT(*) as count FROM inv_material_label WHERE deleted = 0 AND status = 0${dateFilter}`,
      params
    );

    // 本月新增（按 receive_date）
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM inv_material_label
       WHERE deleted = 0 AND YEAR(receive_date) = YEAR(CURDATE()) AND MONTH(receive_date) = MONTH(CURDATE())`
    );

    // 已使用标签数（is_used=1）
    const [usedResult] = await query(
      `SELECT COUNT(*) as count FROM inv_material_label WHERE deleted = 0 AND is_used = 1`
    );

    return NextResponse.json({
      success: true,
      data: {
        total: (totalResult as { count: number }[])[0]?.count || 0,
        active: (activeResult as { count: number }[])[0]?.count || 0,
        inactive: (inactiveResult as { count: number }[])[0]?.count || 0,
        monthlyNew: (monthlyResult as { count: number }[])[0]?.count || 0,
        usedCount: (usedResult as { count: number }[])[0]?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get labels stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
