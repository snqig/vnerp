import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取CRM跟进统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('CRM');
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

    // 待跟进
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM crm_follow_up WHERE deleted = 0 AND status = 1 AND next_follow_date <= CURDATE()${dateFilter}`,
      params
    );

    // 跟进中
    const [followingResult] = await query(
      `SELECT COUNT(*) as count FROM crm_follow_up WHERE deleted = 0 AND status = 2${dateFilter}`,
      params
    );

    // 已转化
    const [convertedResult] = await query(
      `SELECT COUNT(*) as count FROM crm_follow_up WHERE deleted = 0 AND status = 3${dateFilter}`,
      params
    );

    // 已流失
    const [lostResult] = await query(
      `SELECT COUNT(*) as count FROM crm_follow_up WHERE deleted = 0 AND status = 4${dateFilter}`,
      params
    );

    // 本月跟进次数
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM crm_follow_up 
       WHERE deleted = 0 AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        following: followingResult?.count || 0,
        converted: convertedResult?.count || 0,
        lost: lostResult?.count || 0,
        monthlyCount: monthlyResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get CRM follow stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
