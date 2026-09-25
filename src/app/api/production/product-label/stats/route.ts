import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取产品标签统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Production');
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

    // 标签总数
    const [totalResult] = await query(
      `SELECT COUNT(*) as count FROM prod_product_label WHERE deleted = 0${dateFilter}`,
      params
    );

    // 已打印
    const [printedResult] = await query(
      `SELECT COUNT(*) as count FROM prod_product_label WHERE deleted = 0 AND is_printed = 1${dateFilter}`,
      params
    );

    // 待打印
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM prod_product_label WHERE deleted = 0 AND is_printed = 0${dateFilter}`,
      params
    );

    // 本月打印数
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM prod_product_label 
       WHERE deleted = 0 AND is_printed = 1 AND YEAR(printed_at) = YEAR(CURDATE()) AND MONTH(printed_at) = MONTH(CURDATE())`
    );

    // 涉及产品数
    const [productResult] = await query(
      `SELECT COUNT(DISTINCT product_id) as count FROM prod_product_label WHERE deleted = 0`
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
