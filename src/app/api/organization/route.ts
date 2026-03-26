import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取企业信息
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'company') {
      // 获取企业信息
      const result = await query('SELECT * FROM sys_company WHERE id = 1');
      return NextResponse.json({
        success: true,
        data: result[0] || null
      });
    }

    return NextResponse.json({
      success: false,
      message: '无效的请求类型'
    }, { status: 400 });
  } catch (error) {
    console.error('获取企业信息失败:', error);
    return NextResponse.json({
      success: false,
      message: '获取企业信息失败'
    }, { status: 500 });
  }
}

// 更新企业信息
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      full_name,
      short_name,
      code,
      legal_person,
      reg_address,
      contact_phone,
      email,
      tax_no,
      bank_name,
      bank_account,
      website,
      fax,
      postcode,
      description
    } = body;

    await query(`
      UPDATE sys_company SET
        full_name = ?,
        short_name = ?,
        code = ?,
        legal_person = ?,
        reg_address = ?,
        contact_phone = ?,
        email = ?,
        tax_no = ?,
        bank_name = ?,
        bank_account = ?,
        website = ?,
        fax = ?,
        postcode = ?,
        description = ?
      WHERE id = 1
    `, [
      full_name,
      short_name,
      code,
      legal_person,
      reg_address,
      contact_phone,
      email,
      tax_no,
      bank_name,
      bank_account,
      website,
      fax,
      postcode,
      description
    ]);

    return NextResponse.json({
      success: true,
      message: '企业信息更新成功'
    });
  } catch (error) {
    console.error('更新企业信息失败:', error);
    return NextResponse.json({
      success: false,
      message: '更新企业信息失败'
    }, { status: 500 });
  }
}
