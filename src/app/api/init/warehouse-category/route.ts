import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 初始化仓库分类关联
export async function POST(request: NextRequest) {
  try {
    // 直接添加 category_id 字段（如果不存在会报错，但我们可以忽略）
    try {
      await query(`
        ALTER TABLE inv_warehouse 
        ADD COLUMN category_id INT UNSIGNED DEFAULT NULL COMMENT '仓库分类ID' AFTER id,
        ADD KEY idx_category_id (category_id)
      `);
      console.log('已添加 category_id 字段');
    } catch (e) {
      console.log('category_id 字段可能已存在');
    }

    // 更新现有仓库数据，根据 warehouse_type 分配分类
    // 原材料仓 (ID=1): warehouse_type = 1
    await query(`UPDATE inv_warehouse SET category_id = 1 WHERE warehouse_type = 1`);
    
    // 半成品仓 (ID=2): warehouse_type = 2
    await query(`UPDATE inv_warehouse SET category_id = 2 WHERE warehouse_type = 2`);
    
    // 成品仓 (ID=3): warehouse_type = 3
    await query(`UPDATE inv_warehouse SET category_id = 3 WHERE warehouse_type = 3`);
    
    // 辅料仓 (ID=4): warehouse_type = 4
    await query(`UPDATE inv_warehouse SET category_id = 4 WHERE warehouse_type = 4`);

    // 查询更新后的数据
    const warehouses = await query(`
      SELECT w.id, w.warehouse_code as code, w.warehouse_name as name, w.warehouse_type, w.category_id, wc.name as category_name
      FROM inv_warehouse w
      LEFT JOIN sys_warehouse_category wc ON w.category_id = wc.id
      WHERE w.deleted = 0
    `);

    return NextResponse.json({
      success: true,
      message: '仓库分类关联初始化成功',
      data: warehouses
    });
  } catch (error) {
    console.error('初始化仓库分类关联失败:', error);
    return NextResponse.json({
      success: false,
      message: '初始化仓库分类关联失败',
      error: String(error)
    }, { status: 500 });
  }
}
