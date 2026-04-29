import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取部门列表
export async function GET(request: NextRequest) {
  try {
    const departments = await query(
      `SELECT id, dept_name, dept_code, parent_id FROM sys_department WHERE status = 1 AND deleted = 0 ORDER BY sort_order`
    );

    return NextResponse.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    console.error('获取部门列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取部门列表失败' },
      { status: 500 }
    );
  }
}
