import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取质量追溯统计信息
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

    // 已追溯批次
    const [totalResult] = await query(
      `SELECT COUNT(*) as count FROM inv_trace_record WHERE deleted = 0${dateFilter}`,
      params
    );

    // 涉及产品数
    const [productResult] = await query(
      `SELECT COUNT(DISTINCT product_code) as count FROM inv_trace_record WHERE deleted = 0${dateFilter}`,
      params
    );

    // 涉及客户数（操作员）
    const [customerResult] = await query(
      `SELECT COUNT(DISTINCT operator_name) as count FROM inv_trace_record WHERE deleted = 0${dateFilter}`,
      params
    );

    // 本月追溯次数
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM inv_trace_record
       WHERE deleted = 0 AND YEAR(create_time) = YEAR(CURDATE()) AND MONTH(create_time) = MONTH(CURDATE())`
    );

    // 异常批次（通过明细表关联）
    const [abnormalResult] = await query(
      `SELECT COUNT(DISTINCT d.batch_no) as count FROM inv_trace_detail d
       JOIN inv_trace_record r ON d.trace_id = r.id
       WHERE r.deleted = 0`
    );

    return NextResponse.json({
      success: true,
      data: {
        totalBatches: totalResult?.count || 0,
        productCount: productResult?.count || 0,
        customerCount: customerResult?.count || 0,
        monthlyCount: monthlyResult?.count || 0,
        abnormalBatches: abnormalResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get quality trace stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
