import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取仓库分类列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const status = searchParams.get('status');

    let sql = 'SELECT * FROM sys_warehouse_category WHERE deleted = 0';
    const params: any[] = [];

    if (keyword) {
      sql += ' AND (name LIKE ? OR code LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (status !== null && status !== undefined && status !== '') {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY sort_order ASC, id ASC';

    const result = await query(sql, params);
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取仓库分类列表失败:', error);
    return NextResponse.json({
      success: false,
      message: '获取仓库分类列表失败'
    }, { status: 500 });
  }
}

// 创建仓库分类
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      code,
      name,
      description,
      sort_order,
      status
    } = body;

    // 检查编码是否已存在
    const existing = await query('SELECT id FROM sys_warehouse_category WHERE code = ?', [code]);
    if (existing.length > 0) {
      return NextResponse.json({
        success: false,
        message: '分类编码已存在'
      }, { status: 400 });
    }

    await query(`
      INSERT INTO sys_warehouse_category (code, name, description, sort_order, status)
      VALUES (?, ?, ?, ?, ?)
    `, [code, name, description || '', sort_order || 0, status ?? 1]);

    return NextResponse.json({
      success: true,
      message: '仓库分类创建成功'
    });
  } catch (error) {
    console.error('创建仓库分类失败:', error);
    return NextResponse.json({
      success: false,
      message: '创建仓库分类失败'
    }, { status: 500 });
  }
}

// 更新仓库分类
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      code,
      name,
      description,
      sort_order,
      status
    } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        message: '缺少分类ID'
      }, { status: 400 });
    }

    // 检查编码是否已被其他分类使用
    const existing = await query('SELECT id FROM sys_warehouse_category WHERE code = ? AND id != ?', [code, id]);
    if (existing.length > 0) {
      return NextResponse.json({
        success: false,
        message: '分类编码已存在'
      }, { status: 400 });
    }

    await query(`
      UPDATE sys_warehouse_category 
      SET code = ?, name = ?, description = ?, sort_order = ?, status = ?
      WHERE id = ?
    `, [code, name, description || '', sort_order || 0, status ?? 1, id]);

    return NextResponse.json({
      success: true,
      message: '仓库分类更新成功'
    });
  } catch (error) {
    console.error('更新仓库分类失败:', error);
    return NextResponse.json({
      success: false,
      message: '更新仓库分类失败'
    }, { status: 500 });
  }
}

// 删除仓库分类
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        message: '缺少分类ID'
      }, { status: 400 });
    }

    // 软删除
    await query('UPDATE sys_warehouse_category SET deleted = 1 WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: '仓库分类删除成功'
    });
  } catch (error) {
    console.error('删除仓库分类失败:', error);
    return NextResponse.json({
      success: false,
      message: '删除仓库分类失败'
    }, { status: 500 });
  }
}
