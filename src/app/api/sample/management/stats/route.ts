import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';
import { SampleOrderStatus } from '@/domain/sample/value-objects/SampleOrderStatus';

/**
 * 打样管理统计卡片逻辑
 *
 * DB `sal_sample_order` 字段说明：
 *   status: VARCHAR(20) — 订单生命周期状态
 *     draft / pending / in_progress / completed / confirmed / converted / cancelled
 *
 * 前端 StatsCards 卡片语义：
 *   pending     → 待打样 = 'pending'
 *   sampling    → 打样中 = 'in_progress'
 *   completed   → 已完成 = IN ('completed','confirmed','converted')
 *   confirming  → 客户确认中 = 'confirmed'
 *   monthlyCount → 本月创建数
 */
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateFilter =
      startDate && endDate
        ? ' AND DATE(create_time) BETWEEN ? AND ?'
        : '';
    const dateParams =
      startDate && endDate ? [startDate, endDate] : [];

    const baseWhere = `FROM sal_sample_order WHERE deleted = 0${dateFilter}`;

    const [[pending], [sampling], [completed], [confirming], [monthly]] =
      await Promise.all([
        query(
          `SELECT COUNT(*) as count ${baseWhere} AND status = ?`,
          [...dateParams, SampleOrderStatus.PENDING]
        ),
        query(
          `SELECT COUNT(*) as count ${baseWhere} AND status = ?`,
          [...dateParams, SampleOrderStatus.IN_PROGRESS]
        ),
        query(
          `SELECT COUNT(*) as count ${baseWhere} AND status IN ('completed','confirmed','converted')`,
          dateParams
        ),
        query(
          `SELECT COUNT(*) as count ${baseWhere} AND status = ?`,
          [...dateParams, SampleOrderStatus.CONFIRMED]
        ),
        query(
          `SELECT COUNT(*) as count FROM sal_sample_order
           WHERE deleted = 0
             AND YEAR(create_time) = YEAR(CURDATE())
             AND MONTH(create_time) = MONTH(CURDATE())`
        ),
      ]);

    // 注意：上面解构为 [[pending], ...] —— query() 返回行数组，
    // 解构已取出首行对象 { count }，此处直接读 .count，不能再 [0]。
    return NextResponse.json({
      success: true,
      data: {
        pending: (pending as any)?.count || 0,
        sampling: (sampling as any)?.count || 0,
        completed: (completed as any)?.count || 0,
        confirming: (confirming as any)?.count || 0,
        monthlyCount: (monthly as any)?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get sample management stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
