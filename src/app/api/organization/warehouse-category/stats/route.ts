import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取仓库分类统计信息
export async function GET(request: NextRequest) {
  try {
    // 获取每个分类的仓库数量统计
    // 注意：inv_warehouse 表没有 capacity 和 used_capacity 字段，暂时返回0
    const stats = await query(`
      SELECT 
        wc.id,
        wc.code,
        wc.name,
        wc.description,
        wc.sort_order,
        wc.status,
        COUNT(w.id) as warehouse_count,
        SUM(CASE WHEN w.status = 1 THEN 1 ELSE 0 END) as active_warehouse_count,
        0 as total_capacity,
        0 as total_used_capacity
      FROM sys_warehouse_category wc
      LEFT JOIN inv_warehouse w ON wc.id = w.category_id AND w.deleted = 0
      WHERE wc.deleted = 0
      GROUP BY wc.id, wc.code, wc.name, wc.description, wc.sort_order, wc.status
      ORDER BY wc.sort_order ASC
    `);

    // 获取总体统计
    const summary = await query(`
      SELECT 
        COUNT(*) as total_categories,
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active_categories,
        (SELECT COUNT(*) FROM inv_warehouse WHERE deleted = 0) as total_warehouses,
        (SELECT COUNT(*) FROM inv_warehouse WHERE deleted = 0 AND status = 1) as active_warehouses
      FROM sys_warehouse_category
      WHERE deleted = 0
    `);

    return NextResponse.json({
      success: true,
      data: {
        categories: stats,
        summary: summary[0]
      }
    });
  } catch (error) {
    console.error('获取仓库分类统计失败:', error);
    return NextResponse.json({
      success: false,
      message: '获取仓库分类统计失败'
    }, { status: 500 });
  }
}
