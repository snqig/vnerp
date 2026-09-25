import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取SOP管理统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Engineering');
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

    // SOP总数
    const [totalResult] = await query(
      `SELECT COUNT(*) as count FROM eng_sop WHERE deleted = 0${dateFilter}`,
      params
    );

    // 已审核
    const [approvedResult] = await query(
      `SELECT COUNT(*) as count FROM eng_sop WHERE deleted = 0 AND status = 2${dateFilter}`,
      params
    );

    // 待审核
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM eng_sop WHERE deleted = 0 AND status = 1${dateFilter}`,
      params
    );

    // 本月新增
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM eng_sop 
       WHERE deleted = 0 AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())`
    );

    // 有版本的SOP数
    const [versionResult] = await query(
      `SELECT COUNT(DISTINCT sop_id) as count FROM eng_sop_version WHERE deleted = 0`
    );

    return NextResponse.json({
      success: true,
      data: {
        total: totalResult?.count || 0,
        approved: approvedResult?.count || 0,
        pending: pendingResult?.count || 0,
        monthlyNew: monthlyResult?.count || 0,
        withVersion: versionResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get SOP stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
