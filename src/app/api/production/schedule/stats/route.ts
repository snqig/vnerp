import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取生产排程统计信息
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateFilter = '';
    const params: any[] = [];

    if (startDate && endDate) {
      dateFilter = ' AND work_order_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    // 总排程数
    const [totalResult] = await query(
      `SELECT COUNT(*) as count FROM prd_process_card WHERE deleted = 0${dateFilter}`,
      params
    );

    // 待排产数量
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM prd_process_card WHERE deleted = 0 AND burdening_status = 0${dateFilter}`,
      params
    );

    // 已排产数量
    const [scheduledResult] = await query(
      `SELECT COUNT(*) as count FROM prd_process_card WHERE deleted = 0 AND burdening_status = 1${dateFilter}`,
      params
    );

    // 生产中数量
    const [producingResult] = await query(
      `SELECT COUNT(*) as count FROM prd_process_card WHERE deleted = 0 AND burdening_status = 2${dateFilter}`,
      params
    );

    // 已完成数量
    const [completedResult] = await query(
      `SELECT COUNT(*) as count FROM prd_process_card WHERE deleted = 0 AND burdening_status = 3${dateFilter}`,
      params
    );

    // 计划总产量
    const [planQtyResult] = await query(
      `SELECT COALESCE(SUM(plan_qty), 0) as total FROM prd_process_card WHERE deleted = 0${dateFilter}`,
      params
    );

    // 按日期统计
    const dailyStats = await query(
      `SELECT 
        work_order_date as date,
        COUNT(*) as count,
        SUM(plan_qty) as planQty
      FROM prd_process_card 
      WHERE deleted = 0${dateFilter}
      GROUP BY work_order_date 
      ORDER BY work_order_date DESC 
      LIMIT 30`,
      params
    );

    return NextResponse.json({
      success: true,
      data: {
        total: totalResult.count,
        pending: pendingResult.count,
        scheduled: scheduledResult.count,
        producing: producingResult.count,
        completed: completedResult.count,
        planQty: planQtyResult.total,
        dailyStats,
      },
    });
  } catch (error) {
    console.error('获取排程统计失败:', error);
    return NextResponse.json(
      { success: false, message: '获取排程统计失败' },
      { status: 500 }
    );
  }
}
