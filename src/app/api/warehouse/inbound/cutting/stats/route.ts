import { NextRequest, NextResponse } from 'next/server';
import { query, type SqlValue } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 分切记录统计（基于 inv_cutting_record / inv_cutting_detail / inv_material_label 真实表；
// 旧实现查询不存在的 wh_inbound_order 表导致必然 500/全 0）
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateFilter = '';
    const params: SqlValue[] = [];

    if (startDate && endDate) {
      dateFilter = ' AND DATE(cut_time) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    // 分切记录按状态分组：1=正常(已完成)，4=已作废
    const statusRows = (await query(
      `SELECT status, COUNT(*) AS cnt FROM inv_cutting_record
       WHERE 1=1${dateFilter} GROUP BY status`,
      params
    )) as Array<{ status: number; cnt: number }>;
    const statusCount: Record<number, number> = {};
    for (const row of statusRows) {
      statusCount[Number(row.status)] = Number(row.cnt);
    }

    // 今日分切单数
    const todayRows = (await query(
      `SELECT COUNT(*) AS cnt FROM inv_cutting_record WHERE DATE(cut_time) = CURDATE()`
    )) as Array<{ cnt: number }>;

    // 本月分切产出子标签数
    const monthlyRows = (await query(
      `SELECT COUNT(d.id) AS cnt
       FROM inv_cutting_detail d
       JOIN inv_cutting_record r ON d.record_id = r.id
       WHERE YEAR(r.cut_time) = YEAR(CURDATE()) AND MONTH(r.cut_time) = MONTH(CURDATE())`
    )) as Array<{ cnt: number }>;

    const completed = statusCount[1] || 0;
    const voided = statusCount[4] || 0;
    const total = Object.values(statusCount).reduce((a, b) => a + b, 0);
    // 分切是即时完成的业务动作：pending/partial 映射为非常态记录数与作废数
    const pending = Math.max(total - completed - voided, 0);

    return NextResponse.json({
      success: true,
      data: {
        pending,
        partial: voided,
        completed,
        todayCount: Number(todayRows[0]?.cnt) || 0,
        monthlyQty: Number(monthlyRows[0]?.cnt) || 0,
      },
    });
  } catch (error) {
    console.error('Get cutting stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
