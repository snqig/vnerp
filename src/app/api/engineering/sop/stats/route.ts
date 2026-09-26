import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query, type SqlValue } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';
import { currentMonthRange, toLocalDateStr } from '@/lib/date-utils';

// 获取SOP管理统计信息
//
// 注意：`eng_sop` 表只有 effective_date，**没有审核状态列**，因此这里不能用
// `WHERE status = 1/2` 去算「待审核/已审核」—— 那条 SQL 运行期必然报 Unknown column。
// 当前按可用的生命周期列 effective_date 给出「已生效 / 待生效」两个口径。
// TODO(数据模型)：若 SOP 需要正式审批流，需先给 eng_sop 补 audit_status 列 + 迁移，
// 再把下面的 effective 口径换回审核状态口径。
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Engineering');
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
    const today = toLocalDateStr();

    const [totalResult, effectiveResult, pendingResult, monthlyResult, versionResult] =
      await Promise.all([
        query<{ count: number }>(
          `SELECT COUNT(*) as count FROM eng_sop WHERE deleted = 0${dateFilter}`,
          params
        ),
        query<{ count: number }>(
          `SELECT COUNT(*) as count FROM eng_sop
           WHERE deleted = 0 AND effective_date IS NOT NULL AND effective_date <= ?${dateFilter}`,
          [today, ...params]
        ),
        query<{ count: number }>(
          `SELECT COUNT(*) as count FROM eng_sop
           WHERE deleted = 0 AND (effective_date IS NULL OR effective_date > ?)${dateFilter}`,
          [today, ...params]
        ),
        query<{ count: number }>(
          `SELECT COUNT(*) as count FROM eng_sop
           WHERE deleted = 0 AND create_time >= ? AND create_time < ?`,
          [month.start, month.end]
        ),
        query<{ count: number }>(
          `SELECT COUNT(DISTINCT version) as count FROM eng_sop
           WHERE deleted = 0 AND version IS NOT NULL AND version <> ''`
        ),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        total: totalResult[0]?.count || 0,
        effective: effectiveResult[0]?.count || 0,
        pendingEffective: pendingResult[0]?.count || 0,
        monthlyNew: monthlyResult[0]?.count || 0,
        withVersion: versionResult[0]?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get SOP stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
