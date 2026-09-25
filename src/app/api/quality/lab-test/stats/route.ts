import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取实验室检测统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Quality');
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

    // 表名/日期列/结论列对齐 qms_lab_test 真实 schema（create_time / conclusion）
    // 待检测
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM qms_lab_test WHERE deleted = 0 AND status = 1${dateFilter}`,
      params
    );

    // 检测中
    const [testingResult] = await query(
      `SELECT COUNT(*) as count FROM qms_lab_test WHERE deleted = 0 AND status = 2${dateFilter}`,
      params
    );

    // 已完成
    const [completedResult] = await query(
      `SELECT COUNT(*) as count FROM qms_lab_test WHERE deleted = 0 AND status = 3${dateFilter}`,
      params
    );

    // 不合格数
    const [failedResult] = await query(
      `SELECT COUNT(*) as count FROM qms_lab_test WHERE deleted = 0 AND status = 3 AND conclusion = 'fail'${dateFilter}`,
      params
    );

    // 本月检测数
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM qms_lab_test
       WHERE deleted = 0 AND YEAR(create_time) = YEAR(CURDATE()) AND MONTH(create_time) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        testing: testingResult?.count || 0,
        completed: completedResult?.count || 0,
        failed: failedResult?.count || 0,
        monthlyCount: monthlyResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get lab test stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
