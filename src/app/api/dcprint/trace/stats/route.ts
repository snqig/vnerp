import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query, type SqlValue } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';
import { currentMonthRange } from '@/lib/date-utils';

// 获取追溯管理统计信息
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Dcprint');
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateFilter = '';
    const params: SqlValue[] = [];

    // 区间过滤一律写成半开区间 `>= start AND < end`，避免 `DATE(col)` 把函数套在列上导致索引失效
    if (startDate && endDate) {
      const endExclusive = new Date(`${endDate}T00:00:00`);
      endExclusive.setDate(endExclusive.getDate() + 1);
      const pad = (n: number) => String(n).padStart(2, '0');
      const endNext = `${endExclusive.getFullYear()}-${pad(endExclusive.getMonth() + 1)}-${pad(
        endExclusive.getDate()
      )}`;
      dateFilter = ' AND create_time >= ? AND create_time < ?';
      params.push(startDate, endNext);
    }

    const month = currentMonthRange();

    // 追溯批次 / 涉及产品 / 涉及人员（inv_trace_record 无 batch_no，批次口径落在 trace_no 上）
    const [batchResult, productResult, operatorResult] = await Promise.all([
      query<{ count: number }>(
        `SELECT COUNT(DISTINCT trace_no) as count FROM inv_trace_record WHERE deleted = 0${dateFilter}`,
        params
      ),
      query<{ count: number }>(
        `SELECT COUNT(DISTINCT product_code) as count FROM inv_trace_record WHERE deleted = 0${dateFilter}`,
        params
      ),
      query<{ count: number }>(
        `SELECT COUNT(DISTINCT operator_name) as count FROM inv_trace_record WHERE deleted = 0${dateFilter}`,
        params
      ),
    ]);

    // 本月追溯次数
    const [monthlyResult] = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM inv_trace_record
       WHERE deleted = 0 AND trace_time >= ? AND trace_time < ?`,
      [month.start, month.end]
    );

    // 明细批次数（批次号在 inv_trace_detail 上）
    const abnormalResult = await query<{ count: number }>(
      `SELECT COUNT(DISTINCT d.batch_no) as count FROM inv_trace_detail d
       JOIN inv_trace_record r ON d.trace_id = r.id
       WHERE r.deleted = 0`
    );

    return NextResponse.json({
      success: true,
      data: {
        tracedBatches: batchResult[0]?.count || 0,
        involvedProducts: productResult[0]?.count || 0,
        involvedCustomers: operatorResult[0]?.count || 0,
        monthlyTraceCount: monthlyResult?.count || 0,
        abnormalBatches: abnormalResult[0]?.count || 0,
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
