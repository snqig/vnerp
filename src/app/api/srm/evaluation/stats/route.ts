import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';
import { currentMonthRange } from '@/lib/date-utils';

// 获取供应商评价统计信息
// 修正说明：
//   1) `srm_supplier` 表不存在 —— 供应商主数据统一在 `pur_supplier`；
//      供应商的等级口径落在 `pur_supplier.credit_level`（SRM 评价记录另有 `srm_supplier_eval.supplier_level`）；
//   2) `srm_evaluation` 表不存在 —— 真实表是 `srm_supplier_eval`；
//   3) 时间列是 `create_time`，统计不再用 YEAR()/MONTH() 包裹列。
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Srm');
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const month = currentMonthRange();

    let dateFilter = '';
    const params: any[] = [];
    if (startDate && endDate) {
      dateFilter = ' AND create_time >= ? AND create_time <= ?';
      params.push(startDate, `${endDate} 23:59:59`);
    }

    // 供应商总数
    const [totalResult] = await query(
      `SELECT COUNT(*) as count FROM pur_supplier WHERE deleted = 0${dateFilter}`,
      params
    );

    // 优秀供应商
    const [excellentResult] = await query(
      `SELECT COUNT(*) as count FROM pur_supplier WHERE deleted = 0 AND credit_level = 1${dateFilter}`,
      params
    );

    // 合格供应商
    const [qualifiedResult] = await query(
      `SELECT COUNT(*) as count FROM pur_supplier WHERE deleted = 0 AND credit_level = 2${dateFilter}`,
      params
    );

    // 待改进供应商
    const [improveResult] = await query(
      `SELECT COUNT(*) as count FROM pur_supplier WHERE deleted = 0 AND credit_level = 3${dateFilter}`,
      params
    );

    // 本月评价次数
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM srm_supplier_eval
       WHERE create_time >= ? AND create_time < ?`,
      [month.start, month.end]
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
