import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取仓库列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';
    const categoryId = searchParams.get('category_id') || '';

    let sql = `
      SELECT 
        id,
        warehouse_code as code,
        warehouse_name as name,
        CASE 
          WHEN warehouse_type = 1 THEN 'raw'
          WHEN warehouse_type = 2 THEN 'finished'
          WHEN warehouse_type = 3 THEN 'semi'
          WHEN warehouse_type = 4 THEN 'scrap'
          ELSE 'other'
        END as type,
        'own' as nature,
        1 as includeInCalculation,
        address,
        '' as manager,
        contact_phone as contact,
        10000 as capacity,
        0 as usedCapacity,
        status,
        remark,
        create_time as createTime,
        update_time as updateTime
      FROM inv_warehouse 
      WHERE deleted = 0
    `;
    const params: any[] = [];

    if (keyword) {
      sql += ` AND (warehouse_code LIKE ? OR warehouse_name LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (type) {
      const typeMap: { [key: string]: number } = {
        'raw': 1,
        'finished': 2,
        'semi': 3,
        'scrap': 4,
        'other': 5
      };
      sql += ` AND warehouse_type = ?`;
      params.push(typeMap[type] || 1);
    }

    if (categoryId) {
      sql += ` AND category_id = ?`;
      params.push(parseInt(categoryId));
    }

    if (status !== '') {
      sql += ` AND status = ?`;
      params.push(parseInt(status));
    }

    sql += ` ORDER BY create_time DESC`;

    const warehouses = await query(sql, params);

    // 转换数据格式以匹配前端类型
    const formattedWarehouses = warehouses.map((w: any) => ({
      ...w,
      status: w.status === 1 ? 'active' : 'inactive',
      includeInCalculation: true,
    }));

    return NextResponse.json({
      success: true,
      data: formattedWarehouses,
    });
  } catch (error) {
    console.error('获取仓库列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取仓库列表失败' },
      { status: 500 }
    );
  }
}

// 创建仓库
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      code,
      name,
      type,
      nature,
      includeInCalculation,
      address,
      manager,
      contact,
      capacity,
      remark,
      status,
    } = body;

    // 检查编码是否已存在
    const existing = await query(
      'SELECT id FROM inv_warehouse WHERE code = ? AND deleted = 0',
      [code]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, message: '仓库编码已存在' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO inv_warehouse (
        warehouse_code, warehouse_name, warehouse_type, nature, include_in_calculation,
        address, manager, contact_phone, capacity, remark, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        name,
        type === 'raw' ? 1 : type === 'finished' ? 2 : type === 'semi' ? 3 : type === 'scrap' ? 4 : 5,
        nature || 'own',
        includeInCalculation ? 1 : 0,
        address,
        manager,
        contact,
        capacity || 0,
        remark,
        status === 'active' ? 1 : 0,
      ]
    ) as any;

    // 记录操作日志
    await query(
      `INSERT INTO inv_warehouse_log (warehouse_id, operation_type, operation_content) 
       VALUES (?, 'create', ?)`,
      [(result as any).insertId, `创建仓库: ${name}`]
    );

    return NextResponse.json({
      success: true,
      message: '仓库创建成功',
      data: { id: (result as any).insertId },
    });
  } catch (error) {
    console.error('创建仓库失败:', error);
    return NextResponse.json(
      { success: false, message: '创建仓库失败' },
      { status: 500 }
    );
  }
}

// 更新仓库
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      code,
      name,
      type,
      nature,
      includeInCalculation,
      address,
      manager,
      contact,
      capacity,
      remark,
      status,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: '仓库ID不能为空' },
        { status: 400 }
      );
    }

    // 检查编码是否被其他仓库使用
    const existing = await query(
      'SELECT id FROM inv_warehouse WHERE code = ? AND id != ? AND deleted = 0',
      [code, id]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, message: '仓库编码已存在' },
        { status: 400 }
      );
    }

    await query(
      `UPDATE inv_warehouse SET
        warehouse_code = ?,
        warehouse_name = ?,
        warehouse_type = ?,
        nature = ?,
        include_in_calculation = ?,
        address = ?,
        manager = ?,
        contact_phone = ?,
        capacity = ?,
        remark = ?,
        status = ?
      WHERE id = ? AND deleted = 0`,
      [
        code,
        name,
        type === 'raw' ? 1 : type === 'finished' ? 2 : type === 'semi' ? 3 : type === 'scrap' ? 4 : 5,
        nature || 'own',
        includeInCalculation ? 1 : 0,
        address,
        manager,
        contact,
        capacity || 0,
        remark,
        status === 'active' ? 1 : 0,
        id,
      ]
    );

    // 记录操作日志
    await query(
      `INSERT INTO inv_warehouse_log (warehouse_id, operation_type, operation_content) 
       VALUES (?, 'update', ?)`,
      [id, `更新仓库: ${name}`]
    );

    return NextResponse.json({
      success: true,
      message: '仓库更新成功',
    });
  } catch (error) {
    console.error('更新仓库失败:', error);
    return NextResponse.json(
      { success: false, message: '更新仓库失败' },
      { status: 500 }
    );
  }
}

// 删除仓库（软删除）
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: '仓库ID不能为空' },
        { status: 400 }
      );
    }

    // 获取仓库信息用于日志
    const warehouse = await query(
      'SELECT name FROM inv_warehouse WHERE id = ? AND deleted = 0',
      [id]
    );

    if (warehouse.length === 0) {
      return NextResponse.json(
        { success: false, message: '仓库不存在' },
        { status: 404 }
      );
    }

    await query(
      'UPDATE inv_warehouse SET deleted = 1 WHERE id = ?',
      [id]
    );

    // 记录操作日志
    await query(
      `INSERT INTO inv_warehouse_log (warehouse_id, operation_type, operation_content) 
       VALUES (?, 'delete', ?)`,
      [id, `删除仓库: ${warehouse[0].name}`]
    );

    return NextResponse.json({
      success: true,
      message: '仓库删除成功',
    });
  } catch (error) {
    console.error('删除仓库失败:', error);
    return NextResponse.json(
      { success: false, message: '删除仓库失败' },
      { status: 500 }
    );
  }
}
