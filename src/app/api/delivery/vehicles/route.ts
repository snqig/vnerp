import { NextRequest, NextResponse } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';

// 车辆接口
interface Vehicle {
  id?: number;
  vehicle_no: string;
  vehicle_type: string;
  brand: string;
  model: string;
  color: string;
  engine_no: string;
  frame_no: string;
  buy_date: string;
  mileage: number;
  fuel_type: string;
  capacity: number;
  status: number;
  driver_id?: number;
  driver_name: string;
  driver_phone: string;
  insurance_expire: string;
  annual_inspect_expire: string;
  remark: string;
  create_time?: string;
  update_time?: string;
}

// GET - 获取车辆列表或单个车辆
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');
    const keyword = searchParams.get('keyword');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    if (id) {
      // 获取单个车辆
      const sql = 'SELECT * FROM delivery_vehicle WHERE id = ? AND deleted = 0';
      const vehicle = await queryOne<Vehicle>(sql, [parseInt(id)]);
      
      if (!vehicle) {
        return NextResponse.json(
          { success: false, message: '车辆不存在' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ success: true, data: vehicle });
    }

    // 获取列表
    let sql = 'SELECT * FROM delivery_vehicle WHERE deleted = 0';
    const params: any[] = [];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(parseInt(status));
    }

    if (keyword) {
      sql += ' AND (vehicle_no LIKE ? OR brand LIKE ? OR driver_name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    // 获取总数
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = await queryOne<{ total: number }>(countSql, params);
    const total = countResult?.total || 0;

    // 分页
    sql += ' ORDER BY create_time DESC LIMIT ? OFFSET ?';
    params.push(pageSize, (page - 1) * pageSize);

    const vehicles = await query<Vehicle>(sql, params);

    return NextResponse.json({
      success: true,
      data: vehicles,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('获取车辆列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取车辆列表失败' },
      { status: 500 }
    );
  }
}

// POST - 创建车辆
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const sql = `
      INSERT INTO delivery_vehicle (
        vehicle_no, vehicle_type, brand, model, color, engine_no, frame_no,
        buy_date, mileage, fuel_type, capacity, status, driver_id, driver_name,
        driver_phone, insurance_expire, annual_inspect_expire, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      body.vehicle_no,
      body.vehicle_type,
      body.brand,
      body.model,
      body.color,
      body.engine_no,
      body.frame_no,
      body.buy_date,
      body.mileage || 0,
      body.fuel_type,
      body.capacity,
      body.status || 1,
      body.driver_id,
      body.driver_name,
      body.driver_phone,
      body.insurance_expire,
      body.annual_inspect_expire,
      body.remark,
    ];
    
    const result = await execute(sql, params);
    
    return NextResponse.json({
      success: true,
      message: '车辆创建成功',
      data: { id: (result as any).insertId },
    });
  } catch (error) {
    console.error('创建车辆失败:', error);
    return NextResponse.json(
      { success: false, message: '创建车辆失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新车辆
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: '缺少车辆ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    const sql = `
      UPDATE delivery_vehicle SET
        vehicle_no = ?, vehicle_type = ?, brand = ?, model = ?, color = ?,
        engine_no = ?, frame_no = ?, buy_date = ?, mileage = ?, fuel_type = ?,
        capacity = ?, status = ?, driver_id = ?, driver_name = ?, driver_phone = ?,
        insurance_expire = ?, annual_inspect_expire = ?, remark = ?
      WHERE id = ? AND deleted = 0
    `;
    
    const params = [
      body.vehicle_no,
      body.vehicle_type,
      body.brand,
      body.model,
      body.color,
      body.engine_no,
      body.frame_no,
      body.buy_date,
      body.mileage,
      body.fuel_type,
      body.capacity,
      body.status,
      body.driver_id,
      body.driver_name,
      body.driver_phone,
      body.insurance_expire,
      body.annual_inspect_expire,
      body.remark,
      parseInt(id),
    ];
    
    await execute(sql, params);
    
    return NextResponse.json({
      success: true,
      message: '车辆更新成功',
    });
  } catch (error) {
    console.error('更新车辆失败:', error);
    return NextResponse.json(
      { success: false, message: '更新车辆失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除车辆
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: '缺少车辆ID' },
        { status: 400 }
      );
    }
    
    // 软删除
    await execute(
      'UPDATE delivery_vehicle SET deleted = 1 WHERE id = ?',
      [parseInt(id)]
    );
    
    return NextResponse.json({
      success: true,
      message: '车辆删除成功',
    });
  } catch (error) {
    console.error('删除车辆失败:', error);
    return NextResponse.json(
      { success: false, message: '删除车辆失败' },
      { status: 500 }
    );
  }
}
