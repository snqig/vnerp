import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取订单产品统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Orders');
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

    // 产品总数
    const [totalResult] = await query(
      `SELECT COUNT(*) as count FROM prod_product WHERE deleted = 0${dateFilter}`,
      params
    );

    // 已启用
    const [activeResult] = await query(
      `SELECT COUNT(*) as count FROM prod_product WHERE deleted = 0 AND status = 1${dateFilter}`,
      params
    );

    // 已停用
    const [inactiveResult] = await query(
      `SELECT COUNT(*) as count FROM prod_product WHERE deleted = 0 AND status = 0${dateFilter}`,
      params
    );

    // 本月新增产品
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM prod_product 
       WHERE deleted = 0 AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())`
    );

    // 有BOM的产品数
    const [bomResult] = await query(
      `SELECT COUNT(DISTINCT product_id) as count FROM prod_bom WHERE deleted = 0`
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
