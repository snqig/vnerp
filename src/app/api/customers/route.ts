import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 客户数据接口
interface Customer {
  id: number;
  customer_code: string;
  customer_name: string;
  short_name: string;
  customer_type: number;
  industry: string;
  scale: string;
  credit_level: string;
  province: string;
  city: string;
  district: string;
  address: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  fax: string;
  website: string;
  business_license: string;
  tax_number: string;
  bank_name: string;
  bank_account: string;
  salesman_id: number;
  follow_up_status: number;
  status: number;
  remark: string;
  create_time: string;
  update_time: string;
}

// GET - 获取客户列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const keyword = searchParams.get('keyword');
    const customerType = searchParams.get('customerType');
    const followUpStatus = searchParams.get('followUpStatus');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    let sql = `
      SELECT 
        id, customer_code, customer_name, short_name, customer_type,
        industry, scale, credit_level, province, city, district, address,
        contact_name, contact_phone, contact_email, fax, website,
        business_license, tax_number, bank_name, bank_account,
        salesman_id, follow_up_status, status, remark, create_time, update_time
      FROM crm_customer 
      WHERE deleted = 0
    `;
    const params: any[] = [];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(parseInt(status));
    }

    if (customerType && customerType !== 'all') {
      sql += ' AND customer_type = ?';
      params.push(parseInt(customerType));
    }

    if (followUpStatus && followUpStatus !== 'all') {
      sql += ' AND follow_up_status = ?';
      params.push(parseInt(followUpStatus));
    }

    if (keyword) {
      sql += ' AND (customer_code LIKE ? OR customer_name LIKE ? OR contact_name LIKE ? OR contact_phone LIKE ?)';
      const likeKeyword = `%${keyword}%`;
      params.push(likeKeyword, likeKeyword, likeKeyword, likeKeyword);
    }

    sql += ' ORDER BY create_time DESC';

    // 分页
    const offset = (page - 1) * pageSize;
    sql += ' LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const customers = await query<Customer>(sql, params);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM crm_customer WHERE deleted = 0';
    const countParams: any[] = [];
    
    if (status && status !== 'all') {
      countSql += ' AND status = ?';
      countParams.push(parseInt(status));
    }
    if (customerType && customerType !== 'all') {
      countSql += ' AND customer_type = ?';
      countParams.push(parseInt(customerType));
    }
    if (followUpStatus && followUpStatus !== 'all') {
      countSql += ' AND follow_up_status = ?';
      countParams.push(parseInt(followUpStatus));
    }
    if (keyword) {
      countSql += ' AND (customer_code LIKE ? OR customer_name LIKE ? OR contact_name LIKE ? OR contact_phone LIKE ?)';
      const likeKeyword = `%${keyword}%`;
      countParams.push(likeKeyword, likeKeyword, likeKeyword, likeKeyword);
    }
    
    const countResult = await query<{ total: number }>(countSql, countParams);
    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: customers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('获取客户列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取客户列表失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST - 创建新客户
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customer_code,
      customer_name,
      short_name,
      customer_type,
      industry,
      scale,
      credit_level,
      province,
      city,
      district,
      address,
      contact_name,
      contact_phone,
      contact_email,
      fax,
      website,
      business_license,
      tax_number,
      bank_name,
      bank_account,
      salesman_id,
      follow_up_status,
      status,
      remark,
    } = body;

    const sql = `
      INSERT INTO crm_customer (
        customer_code, customer_name, short_name, customer_type,
        industry, scale, credit_level, province, city, district, address,
        contact_name, contact_phone, contact_email, fax, website,
        business_license, tax_number, bank_name, bank_account,
        salesman_id, follow_up_status, status, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await query(sql, [
      customer_code,
      customer_name,
      short_name,
      customer_type,
      industry,
      scale,
      credit_level,
      province,
      city,
      district,
      address,
      contact_name,
      contact_phone,
      contact_email,
      fax,
      website,
      business_license,
      tax_number,
      bank_name,
      bank_account,
      salesman_id,
      follow_up_status || 1,
      status || 1,
      remark,
    ]);

    return NextResponse.json({
      success: true,
      message: '客户创建成功',
      data: { id: (result as any).insertId },
    });
  } catch (error) {
    console.error('创建客户失败:', error);
    return NextResponse.json(
      { success: false, message: '创建客户失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT - 更新客户
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: '缺少客户ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      customer_name,
      short_name,
      customer_type,
      industry,
      scale,
      credit_level,
      province,
      city,
      district,
      address,
      contact_name,
      contact_phone,
      contact_email,
      fax,
      website,
      business_license,
      tax_number,
      bank_name,
      bank_account,
      salesman_id,
      follow_up_status,
      status,
      remark,
    } = body;

    const sql = `
      UPDATE crm_customer SET
        customer_name = ?, short_name = ?, customer_type = ?,
        industry = ?, scale = ?, credit_level = ?, province = ?, city = ?, district = ?, address = ?,
        contact_name = ?, contact_phone = ?, contact_email = ?, fax = ?, website = ?,
        business_license = ?, tax_number = ?, bank_name = ?, bank_account = ?,
        salesman_id = ?, follow_up_status = ?, status = ?, remark = ?
      WHERE id = ? AND deleted = 0
    `;

    await query(sql, [
      customer_name,
      short_name,
      customer_type,
      industry,
      scale,
      credit_level,
      province,
      city,
      district,
      address,
      contact_name,
      contact_phone,
      contact_email,
      fax,
      website,
      business_license,
      tax_number,
      bank_name,
      bank_account,
      salesman_id,
      follow_up_status,
      status,
      remark,
      id,
    ]);

    return NextResponse.json({
      success: true,
      message: '客户更新成功',
    });
  } catch (error) {
    console.error('更新客户失败:', error);
    return NextResponse.json(
      { success: false, message: '更新客户失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE - 删除客户
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: '缺少客户ID' },
        { status: 400 }
      );
    }

    // 软删除
    await query(
      'UPDATE crm_customer SET deleted = 1 WHERE id = ?',
      [id]
    );

    return NextResponse.json({
      success: true,
      message: '客户删除成功',
    });
  } catch (error) {
    console.error('删除客户失败:', error);
    return NextResponse.json(
      { success: false, message: '删除客户失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}
