import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';
import { currentMonthRange } from '@/lib/date-utils';

// 获取订单产品统计信息
// 修正说明：
//   1) 原表 `prod_product` / `prod_bom` 在库中不存在 —— 产品主数据是 `mdm_product`，
//      生产 BOM 是 `prd_bom`（有 product_id → mdm_product）；
//   2) 时间列是 `create_time`，不再用 YEAR()/MONTH()/DATE() 包裹列，改为月份区间。
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Orders');
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

    // 产品总数
    const [totalResult] = await query(
      `SELECT COUNT(*) as count FROM mdm_product WHERE deleted = 0${dateFilter}`,
      params
    );

    // 已启用
    const [activeResult] = await query(
      `SELECT COUNT(*) as count FROM mdm_product WHERE deleted = 0 AND status = 1${dateFilter}`,
      params
    );

    // 已停用
    const [inactiveResult] = await query(
      `SELECT COUNT(*) as count FROM mdm_product WHERE deleted = 0 AND status = 0${dateFilter}`,
      params
    );

    // 本月新增产品
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM mdm_product
       WHERE create_time >= ? AND create_time < ?`,
      [month.start, month.end]
    );

    // 有BOM的产品数
    const [bomResult] = await query(
      `SELECT COUNT(DISTINCT product_id) as count FROM prd_bom WHERE deleted = 0`
    );

    return NextResponse.json({
      success: true,
      data: {
        total: totalResult?.count || 0,
        active: activeResult?.count || 0,
        inactive: inactiveResult?.count || 0,
        monthlyNew: monthlyResult?.count || 0,
        withBom: bomResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get products stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
