import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取BOM管理统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Orders');
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

    // BOM总数（bom_header 是 BOM 管理主表，状态枚举：10草稿/20已审核/30已发布/90停用）
    const [totalResult] = await query(
      `SELECT COUNT(*) as count FROM bom_header WHERE deleted = 0${dateFilter}`,
      params
    );

    // 已审核（已通过草稿/审核阶段：status >= 20）
    const [approvedResult] = await query(
      `SELECT COUNT(*) as count FROM bom_header WHERE deleted = 0 AND status >= 20${dateFilter}`,
      params
    );

    // 待审核（草稿态：status = 10）
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM bom_header WHERE deleted = 0 AND status = 10${dateFilter}`,
      params
    );

    // 本月新增BOM
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM bom_header
       WHERE deleted = 0 AND YEAR(create_time) = YEAR(CURDATE()) AND MONTH(create_time) = MONTH(CURDATE())`
    );

    // 有版本的BOM数（版本变更记录表 bom_version_history，无软删列）
    const [versionResult] = await query(
      `SELECT COUNT(DISTINCT bom_id) as count FROM bom_version_history`
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
    console.error('Get BOM stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
