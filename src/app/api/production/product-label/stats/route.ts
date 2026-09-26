import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';
import { currentMonthRange } from '@/lib/date-utils';

// 获取产品标签统计信息
// 修正说明：
//   1) 原表 `prod_product_label` 在库中不存在 —— 真实表是 `prd_product_label`；
//   2) 该表没有 `is_printed` / `printed_at` / `product_id` 列，对应的是：
//      打印标记靠 print_count、打印时间靠 print_time、物料维度靠 material_id；
//   3) 时间列统计不再用 YEAR()/MONTH() 包裹列，改为区间。
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Production');
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

    // 标签总数
    const [totalResult] = await query(
      `SELECT COUNT(*) as count FROM prd_product_label WHERE deleted = 0${dateFilter}`,
      params
    );

    // 已打印
    const [printedResult] = await query(
      `SELECT COUNT(*) as count FROM prd_product_label WHERE deleted = 0 AND print_count > 0${dateFilter}`,
      params
    );

    // 待打印
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM prd_product_label WHERE deleted = 0 AND print_count = 0${dateFilter}`,
      params
    );

    // 本月打印数
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM prd_product_label
       WHERE deleted = 0 AND print_count > 0
         AND print_time >= ? AND print_time < ?`,
      [month.start, month.end]
    );

    // 涉及产品数
    const [productResult] = await query(
      `SELECT COUNT(DISTINCT material_id) as count FROM prd_product_label WHERE deleted = 0`
    );

    return NextResponse.json({
      success: true,
      data: {
        total: totalResult?.count || 0,
        printed: printedResult?.count || 0,
        pending: pendingResult?.count || 0,
        monthlyPrinted: monthlyResult?.count || 0,
        involvedProducts: productResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get product label stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
