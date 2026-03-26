import { NextRequest, NextResponse } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';

// 采购申请接口
interface PurchaseRequest {
  id?: number;
  request_no: string;
  request_date: string;
  request_type: string;
  request_dept: string;
  requester_id?: number;
  requester_name: string;
  total_amount: number;
  currency: string;
  status: number;
  priority: number;
  expected_date: string;
  supplier_id?: number;
  supplier_name: string;
  remark: string;
  approver_id?: number;
  approver_name: string;
  approve_date: string;
  approve_remark: string;
  create_time?: string;
  update_time?: string;
}

// 申请明细接口
interface RequestItem {
  id?: number;
  request_id: number;
  line_no: number;
  material_id?: number;
  material_code: string;
  material_name: string;
  material_spec: string;
  material_unit: string;
  quantity: number;
  price: number;
  amount: number;
  supplier_id?: number;
  supplier_name: string;
  expected_date: string;
  remark: string;
}

// GET - 获取采购申请列表或单个申请
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');
    const keyword = searchParams.get('keyword');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    if (id) {
      // 获取单个申请及明细
      const requestSql = 'SELECT * FROM pur_request WHERE id = ? AND deleted = 0';
      const request = await queryOne<PurchaseRequest>(requestSql, [parseInt(id)]);
      
      if (!request) {
        return NextResponse.json(
          { success: false, message: '采购申请不存在' },
          { status: 404 }
        );
      }
      
      // 获取明细
      const itemsSql = 'SELECT * FROM pur_request_item WHERE request_id = ? AND deleted = 0 ORDER BY line_no';
      const items = await query<RequestItem>(itemsSql, [parseInt(id)]);
      
      return NextResponse.json({ 
        success: true, 
        data: { ...request, items } 
      });
    }

    // 获取列表
    let sql = 'SELECT * FROM pur_request WHERE deleted = 0';
    const params: any[] = [];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(parseInt(status));
    }

    if (keyword) {
      sql += ' AND (request_no LIKE ? OR requester_name LIKE ? OR request_dept LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    // 获取总数
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = await queryOne<{ total: number }>(countSql, params);
    const total = countResult?.total || 0;

    // 分页
    sql += ' ORDER BY create_time DESC LIMIT ? OFFSET ?';
    params.push(pageSize, (page - 1) * pageSize);

    const requests = await query<PurchaseRequest>(sql, params);

    return NextResponse.json({
      success: true,
      data: requests,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('获取采购申请列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取采购申请列表失败' },
      { status: 500 }
    );
  }
}

// POST - 创建采购申请
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 生成申请单号
    const requestNo = `PR${new Date().toISOString().slice(0,10).replace(/-/g,'')}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    
    // 计算总金额
    const totalAmount = body.items?.reduce((sum: number, item: RequestItem) => 
      sum + (item.amount || 0), 0) || 0;
    
    // 插入主表
    const requestSql = `
      INSERT INTO pur_request (
        request_no, request_date, request_type, request_dept, requester_name,
        total_amount, currency, status, priority, expected_date, supplier_name, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const requestParams = [
      requestNo,
      body.request_date || new Date().toISOString().split('T')[0],
      body.request_type,
      body.request_dept,
      body.requester_name,
      totalAmount,
      body.currency || 'CNY',
      body.status || 0,
      body.priority || 1,
      body.expected_date,
      body.supplier_name,
      body.remark,
    ];
    
    const result = await execute(requestSql, requestParams) as any;
    const requestId = (result as any).insertId;
    
    // 插入明细
    if (body.items && body.items.length > 0) {
      const itemSql = `
        INSERT INTO pur_request_item (
          request_id, line_no, material_code, material_name, material_spec,
          material_unit, quantity, price, amount, supplier_name, expected_date, remark
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      for (let i = 0; i < body.items.length; i++) {
        const item = body.items[i];
        await execute(itemSql, [
          requestId,
          i + 1,
          item.material_code,
          item.material_name,
          item.material_spec,
          item.material_unit,
          item.quantity,
          item.price || 0,
          item.amount || (item.quantity * (item.price || 0)),
          item.supplier_name,
          item.expected_date,
          item.remark,
        ]);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: '采购申请创建成功',
      data: { id: requestId, request_no: requestNo },
    });
  } catch (error) {
    console.error('创建采购申请失败:', error);
    return NextResponse.json(
      { success: false, message: '创建采购申请失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新采购申请
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: '缺少申请ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    // 计算总金额
    const totalAmount = body.items?.reduce((sum: number, item: RequestItem) => 
      sum + (item.amount || 0), 0) || 0;
    
    // 更新主表
    const requestSql = `
      UPDATE pur_request SET
        request_date = ?, request_type = ?, request_dept = ?, requester_name = ?,
        total_amount = ?, priority = ?, expected_date = ?, supplier_name = ?, remark = ?
      WHERE id = ? AND deleted = 0
    `;
    
    await execute(requestSql, [
      body.request_date,
      body.request_type,
      body.request_dept,
      body.requester_name,
      totalAmount,
      body.priority,
      body.expected_date,
      body.supplier_name,
      body.remark,
      parseInt(id),
    ]);
    
    // 删除旧明细
    await execute('UPDATE pur_request_item SET deleted = 1 WHERE request_id = ?', [parseInt(id)]);
    
    // 插入新明细
    if (body.items && body.items.length > 0) {
      const itemSql = `
        INSERT INTO pur_request_item (
          request_id, line_no, material_code, material_name, material_spec,
          material_unit, quantity, price, amount, supplier_name, expected_date, remark
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      for (let i = 0; i < body.items.length; i++) {
        const item = body.items[i];
        await execute(itemSql, [
          parseInt(id),
          i + 1,
          item.material_code,
          item.material_name,
          item.material_spec,
          item.material_unit,
          item.quantity,
          item.price || 0,
          item.amount || (item.quantity * (item.price || 0)),
          item.supplier_name,
          item.expected_date,
          item.remark,
        ]);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: '采购申请更新成功',
    });
  } catch (error) {
    console.error('更新采购申请失败:', error);
    return NextResponse.json(
      { success: false, message: '更新采购申请失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除采购申请
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: '缺少申请ID' },
        { status: 400 }
      );
    }
    
    // 软删除主表
    await execute('UPDATE pur_request SET deleted = 1 WHERE id = ?', [parseInt(id)]);
    
    // 软删除明细
    await execute('UPDATE pur_request_item SET deleted = 1 WHERE request_id = ?', [parseInt(id)]);
    
    return NextResponse.json({
      success: true,
      message: '采购申请删除成功',
    });
  } catch (error) {
    console.error('删除采购申请失败:', error);
    return NextResponse.json(
      { success: false, message: '删除采购申请失败' },
      { status: 500 }
    );
  }
}
