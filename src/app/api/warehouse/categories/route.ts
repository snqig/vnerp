import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取仓库分类列表（用于下拉选择）
export async function GET(request: NextRequest) {
  try {
    const categories = await query(`
      SELECT 
        id,
        code,
        name,
        description
      FROM sys_warehouse_category
      WHERE deleted = 0 AND status = 1
      ORDER BY sort_order ASC
    `);

    return NextResponse.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('获取仓库分类列表失败:', error);
    return NextResponse.json({
      success: false,
      message: '获取仓库分类列表失败'
    }, { status: 500 });
  }
}
