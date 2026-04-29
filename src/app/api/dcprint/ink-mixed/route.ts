import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse, logOperation } from '@/lib/api-response';
import { randomUUID } from 'crypto';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const recordNo = searchParams.get('recordNo') || '';
  const colorName = searchParams.get('colorName') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE deleted = 0';
  const params: any[] = [];
  if (recordNo) { where += ' AND record_no LIKE ?'; params.push('%' + recordNo + '%'); }
  if (colorName) { where += ' AND color_name LIKE ?'; params.push('%' + colorName + '%'); }
  if (status) { where += ' AND status = ?'; params.push(Number(status)); }

  const countSql = 'SELECT COUNT(*) as total FROM ink_mixed_record ' + where;
  const totalRows: any = await query(countSql, params);
  const total = totalRows[0]?.total || 0;

  const dataSql = 'SELECT * FROM ink_mixed_record ' + where + ' ORDER BY mix_time DESC LIMIT ? OFFSET ?';
  const rows: any = await query(dataSql, [...params, pageSize, (page - 1) * pageSize]);

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { base_ink_id, base_ink_code, base_ink_name, mix_ratio, color_name, color_code,
    company_id, company_name, mix_time, operator_id, operator_name, quantity, unit,
    warehouse_id, location_id, expire_time, remark } = body;

  const now = new Date();
  const recordNo = 'MR' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const result: any = await execute(
    'INSERT INTO ink_mixed_record (record_no, base_ink_id, base_ink_code, base_ink_name, mix_ratio, color_name, color_code, company_id, company_name, mix_time, operator_id, operator_name, quantity, unit, warehouse_id, location_id, status, expire_time, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)',
    [recordNo, base_ink_id, base_ink_code || null, base_ink_name || null, mix_ratio || null, color_name, color_code || null,
      company_id || null, company_name || null, mix_time, operator_id || null, operator_name || null,
      quantity, unit || 'kg', warehouse_id || null, location_id || null, expire_time || null, remark || null]
  );

  const qrCode = 'IK-' + randomUUID().replace(/-/g, '').substring(0, 16);
  await execute(
    `INSERT INTO qrcode_record (qr_code, qr_type, ref_id, ref_no, material_id, material_code, material_name, quantity, unit, warehouse_id, expiry_date, status, extra_data)
     VALUES (?, 'ink_mixed', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      qrCode, result.insertId, recordNo,
      base_ink_id || null, base_ink_code || null, color_name || '',
      quantity || 0, unit || 'kg', warehouse_id || null,
      expire_time || null,
      JSON.stringify({ mix_ratio, color_code, base_ink_name }),
    ]
  );

  await logOperation({
    title: '调色油墨入库',
    oper_type: '调色',
    oper_method: 'POST',
    oper_url: '/api/dcprint/ink-mixed',
    oper_param: JSON.stringify({ color_name, quantity }),
    oper_result: `调色油墨 ${recordNo} 入库成功，已生成二维码 ${qrCode}`,
  });

  return successResponse({ id: result.insertId, record_no: recordNo, qr_code: qrCode }, '调色油墨入库成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, status, remark } = body;

  if (status !== undefined) {
    await execute('UPDATE ink_mixed_record SET status = ? WHERE id = ? AND deleted = 0', [status, id]);
  }
  if (remark !== undefined) {
    await execute('UPDATE ink_mixed_record SET remark = ? WHERE id = ? AND deleted = 0', [remark, id]);
  }

  return successResponse(null, '更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });

  await execute('UPDATE ink_mixed_record SET deleted = 1 WHERE id = ?', [Number(id)]);
  return successResponse(null, '删除成功');
});
