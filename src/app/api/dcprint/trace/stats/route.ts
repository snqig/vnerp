import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query, type SqlValue } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取追溯管理统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Dcprint');
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateFilter = '';
    const params: SqlValue[] = [];

    if (startDate && endDate) {
      dateFilter = ' AND DATE(created_at) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    // 已追溯批次（inv_trace_record）
    const [batchResult] = await query(
      `SELECT COUNT(DISTINCT batch_no) as count FROM inv_trace_record WHERE deleted = 0${dateFilter}`,
      params
    );

    // 涉及产品数
    const [productResult] = await query(
      `SELECT COUNT(DISTINCT product_code) as count FROM inv_trace_record WHERE deleted = 0${dateFilter}`,
      params
    );

    // 涉及客户数
    const [customerResult] = await query(
      `SELECT COUNT(DISTINCT operator_name) as count FROM inv_trace_record WHERE deleted = 0${dateFilter}`,
      params
    );

    // 本月追溯次数
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM inv_trace_record 
       WHERE deleted = 0 AND YEAR(trace_time) = YEAR(CURDATE()) AND MONTH(trace_time) = MONTH(CURDATE())`
    );

    // 异常批次（通过 inv_trace_detail 关联物料判断）
    const [abnormalResult] = await query(
      `SELECT COUNT(DISTINCT d.batch_no) as count FROM inv_trace_detail d 
       JOIN inv_trace_record r ON d.trace_id = r.id 
       WHERE r.deleted = 0 AND d.deleted = 0`
    );

    return NextResponse.json({
      success: true,
      data: {
        tracedBatches: batchResult?.count || 0,
        involvedProducts: productResult?.count || 0,
        involvedCustomers: customerResult?.count || 0,
        monthlyTraceCount: monthlyResult?.count || 0,
        abnormalBatches: abnormalResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get trace stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
