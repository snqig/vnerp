import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';
import { SampleOrderStatus } from '@/domain/sample/value-objects/SampleOrderStatus';

/**
 * 打样订单统计卡片逻辑
 *
 * DB `sal_sample_order` 字段说明：
 *   status: VARCHAR(20) — 订单生命周期状态
 *     draft / pending / in_progress / completed / confirmed / converted / cancelled
 *   delivery_status: VARCHAR(20) — 交付状态
 *     pending / delivered / signed
 *
 * 前端 StatsCards 卡片语义对齐：
 *   pending       → 状态 = pending（待确认/待打样）
 *   producing     → 状态 = in_progress（生产中/打样中）
 *   shipping      → 交付状态 = pending 且 订单已完成（待发货）
 *   completed     → 状态 IN (completed, confirmed, converted)（已完成/已确认/已转大货）
 *   monthlyCount  → 本月创建的打样订单总数
 */
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
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

    const PENDING = `status = ?${dateFilter}`;
    const PRODUCING = `status = ?${dateFilter}`;
    const SHIPPING = `delivery_status = ? AND status IN ('completed','confirmed')${dateFilter}`;
    const COMPLETED = `status IN ('completed','confirmed','converted')${dateFilter}`;

    const [[pendingResult], [producingResult], [shippingResult], [completedResult], [monthlyResult]] =
      await Promise.all([
        query(
          `SELECT COUNT(*) as count FROM sal_sample_order WHERE deleted = 0 AND ${PENDING}`,
          [...params.map(() => SampleOrderStatus.PENDING)]
        ),
        query(
          `SELECT COUNT(*) as count FROM sal_sample_order WHERE deleted = 0 AND ${PRODUCING}`,
          [...params.map(() => SampleOrderStatus.IN_PROGRESS)]
        ),
        query(
          `SELECT COUNT(*) as count FROM sal_sample_order WHERE deleted = 0 AND ${SHIPPING}`,
          [SampleOrderStatus.PENDING, ...params]
        ),
        query(
          `SELECT COUNT(*) as count FROM sal_sample_order WHERE deleted = 0 AND ${COMPLETED}`,
          params
        ),
        query(`
          SELECT COUNT(*) as count FROM sal_sample_order
          WHERE deleted = 0
            AND YEAR(create_time) = YEAR(CURDATE())
            AND MONTH(create_time) = MONTH(CURDATE())
        `),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        pending: (pendingResult as any)?.count || 0,
        producing: (producingResult as any)?.count || 0,
        shipping: (shippingResult as any)?.count || 0,
        completed: (completedResult as any)?.count || 0,
        monthlyCount: (monthlyResult as any)?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get sample orders stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
