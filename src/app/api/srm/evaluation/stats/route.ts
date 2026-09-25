import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取供应商评价统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Srm');
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

    // 供应商总数
    const [totalResult] = await query(
      `SELECT COUNT(*) as count FROM srm_supplier WHERE deleted = 0`
    );

    // 优秀供应商
    const [excellentResult] = await query(
      `SELECT COUNT(*) as count FROM srm_supplier WHERE deleted = 0 AND level = 1`
    );

    // 合格供应商
    const [qualifiedResult] = await query(
      `SELECT COUNT(*) as count FROM srm_supplier WHERE deleted = 0 AND level = 2`
    );

    // 待改进供应商
    const [improveResult] = await query(
      `SELECT COUNT(*) as count FROM srm_supplier WHERE deleted = 0 AND level = 3`
    );

    // 本月评价次数
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM srm_evaluation 
       WHERE deleted = 0 AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        total: totalResult?.count || 0,
        excellent: excellentResult?.count || 0,
        qualified: qualifiedResult?.count || 0,
        improve: improveResult?.count || 0,
        monthlyEval: monthlyResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get evaluation stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
