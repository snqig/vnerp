import { NextRequest, NextResponse } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';

// 打样单接口
interface SampleOrder {
  id?: number;
  sample_no: string;
  order_month: number;
  order_date: string;
  sample_type: string;
  customer_name: string;
  print_method: string;
  color_sequence: string;
  product_name: string;
  material_code: string;
  size_spec: string;
  material_desc: string;
  sample_order_no: string;
  required_date: string;
  progress_status: string;
  is_confirmed: number;
  is_urgent: number;
  is_produce_together: number;
  quantity: number;
  progress_detail: string;
  sample_count: number;
  sample_reason: string;
  order_tracker: string;
  provided_material: string;
  receive_time: string;
  mylar_info: string;
  sample_stock: string;
  customer_confirm: string;
  remark: string;
  status: number;
  create_time?: string;
  update_time?: string;
}

// GET - 获取打样单列表或单个打样单
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');
    const customer = searchParams.get('customer');
    const sampleType = searchParams.get('sampleType');
    const keyword = searchParams.get('keyword');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    if (id) {
      // 获取单个打样单
      const sql = 'SELECT * FROM sample_order WHERE id = ? AND deleted = 0';
      const order = await queryOne<SampleOrder>(sql, [parseInt(id)]);
      
      if (!order) {
        return NextResponse.json(
          { success: false, message: '打样单不存在' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ 
        success: true, 
        data: order 
      });
    }

    // 获取列表
    let sql = 'SELECT * FROM sample_order WHERE deleted = 0';
    const params: any[] = [];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(parseInt(status));
    }

    if (customer) {
      sql += ' AND customer_name LIKE ?';
      params.push(`%${customer}%`);
    }

    if (sampleType) {
      sql += ' AND sample_type = ?';
      params.push(sampleType);
    }

    if (keyword) {
      sql += ' AND (sample_no LIKE ? OR customer_name LIKE ? OR product_name LIKE ? OR material_code LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    // 获取总数
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = await queryOne<{ total: number }>(countSql, params);
    const total = countResult?.total || 0;

    // 分页
    sql += ' ORDER BY order_date DESC, id DESC LIMIT ? OFFSET ?';
    params.push(pageSize, (page - 1) * pageSize);

    const orders = await query<SampleOrder>(sql, params);

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('获取打样单列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取打样单列表失败' },
      { status: 500 }
    );
  }
}

// POST - 创建打样单
export async function POST(request: NextRequest) {
  try {
    const body: SampleOrder = await request.json();
    
    // 生成打样单号
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
    const sampleNo = `DY-${dateStr}-${randomStr}`;
    
    const sql = `INSERT INTO sample_order (
      sample_no, order_month, order_date, sample_type, customer_name,
      print_method, color_sequence, product_name, material_code, size_spec,
      material_desc, sample_order_no, required_date, progress_status,
      is_confirmed, is_urgent, is_produce_together, quantity, progress_detail,
      sample_count, sample_reason, order_tracker, provided_material, receive_time,
      mylar_info, sample_stock, customer_confirm, remark, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const params = [
      sampleNo,
      body.order_month,
      body.order_date,
      body.sample_type,
      body.customer_name,
      body.print_method,
      body.color_sequence,
      body.product_name,
      body.material_code,
      body.size_spec,
      body.material_desc,
      body.sample_order_no,
      body.required_date,
      body.progress_status,
      body.is_confirmed || 0,
      body.is_urgent || 0,
      body.is_produce_together || 0,
      body.quantity,
      body.progress_detail,
      body.sample_count || 1,
      body.sample_reason,
      body.order_tracker,
      body.provided_material,
      body.receive_time,
      body.mylar_info,
      body.sample_stock,
      body.customer_confirm,
      body.remark,
      body.status || 0,
    ];
    
    const result = await execute(sql, params);
    
    return NextResponse.json({
      success: true,
      message: '打样单创建成功',
      data: { id: (result as any).insertId, sample_no: sampleNo },
    });
  } catch (error) {
    console.error('创建打样单失败:', error);
    return NextResponse.json(
      { success: false, message: '创建打样单失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT - 更新打样单
export async function PUT(request: NextRequest) {
  try {
    const body: SampleOrder = await request.json();
    const { id } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: '缺少打样单ID' },
        { status: 400 }
      );
    }
    
    const sql = `UPDATE sample_order SET
      order_month = ?, order_date = ?, sample_type = ?, customer_name = ?,
      print_method = ?, color_sequence = ?, product_name = ?, material_code = ?, size_spec = ?,
      material_desc = ?, sample_order_no = ?, required_date = ?, progress_status = ?,
      is_confirmed = ?, is_urgent = ?, is_produce_together = ?, quantity = ?, progress_detail = ?,
      sample_count = ?, sample_reason = ?, order_tracker = ?, provided_material = ?, receive_time = ?,
      mylar_info = ?, sample_stock = ?, customer_confirm = ?, remark = ?, status = ?
    WHERE id = ? AND deleted = 0`;
    
    const params = [
      body.order_month,
      body.order_date,
      body.sample_type,
      body.customer_name,
      body.print_method,
      body.color_sequence,
      body.product_name,
      body.material_code,
      body.size_spec,
      body.material_desc,
      body.sample_order_no,
      body.required_date,
      body.progress_status,
      body.is_confirmed,
      body.is_urgent,
      body.is_produce_together,
      body.quantity,
      body.progress_detail,
      body.sample_count,
      body.sample_reason,
      body.order_tracker,
      body.provided_material,
      body.receive_time,
      body.mylar_info,
      body.sample_stock,
      body.customer_confirm,
      body.remark,
      body.status,
      id,
    ];
    
    const result = await execute(sql, params);
    
    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: '打样单不存在或已被删除' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: '打样单更新成功',
    });
  } catch (error) {
    console.error('更新打样单失败:', error);
    return NextResponse.json(
      { success: false, message: '更新打样单失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除打样单
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: '缺少打样单ID' },
        { status: 400 }
      );
    }
    
    // 软删除
    await execute('UPDATE sample_order SET deleted = 1 WHERE id = ?', [parseInt(id)]);
    
    return NextResponse.json({
      success: true,
      message: '打样单删除成功',
    });
  } catch (error) {
    console.error('删除打样单失败:', error);
    return NextResponse.json(
      { success: false, message: '删除打样单失败' },
      { status: 500 }
    );
  }
}
