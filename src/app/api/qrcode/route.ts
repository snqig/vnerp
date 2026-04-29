import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction } from '@/lib/db';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';
import { randomUUID } from 'crypto';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const qrType = searchParams.get('qr_type') || '';
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE q.deleted = 0';
  const params: any[] = [];
  if (qrType) { where += ' AND q.qr_type = ?'; params.push(qrType); }
  if (status) { where += ' AND q.status = ?'; params.push(Number(status)); }
  if (keyword) {
    where += ' AND (q.qr_code LIKE ? OR q.ref_no LIKE ? OR q.material_name LIKE ? OR q.batch_no LIKE ?)';
    const like = `%${keyword}%`;
    params.push(like, like, like, like);
  }

  const totalRows: any = await query(`SELECT COUNT(*) as total FROM qrcode_record q ${where}`, params);
  const total = totalRows[0]?.total || 0;

  const rows: any = await query(
    `SELECT q.* FROM qrcode_record q ${where} ORDER BY q.create_time DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const {
    qr_type, ref_id, ref_no, batch_no, material_id, material_code, material_name,
    specification, quantity, unit, warehouse_id, warehouse_name, location,
    supplier_id, supplier_name, customer_id, customer_name,
    work_order_id, work_order_no, production_date, expiry_date, extra_data, remark
  } = body;

  if (!qr_type) return errorResponse('二维码类型不能为空', 400, 400);

  const qrCode = qr_type.toUpperCase().substring(0, 2) + '-' + randomUUID().replace(/-/g, '').substring(0, 16);

  const result: any = await execute(
    `INSERT INTO qrcode_record (qr_code, qr_type, ref_id, ref_no, batch_no, material_id, material_code, material_name,
      specification, quantity, unit, warehouse_id, warehouse_name, location, supplier_id, supplier_name,
      customer_id, customer_name, work_order_id, work_order_no, production_date, expiry_date, extra_data, status, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [qrCode, qr_type, ref_id || null, ref_no || null, batch_no || null,
     material_id || null, material_code || null, material_name || null,
     specification || null, quantity || 0, unit || null,
     warehouse_id || null, warehouse_name || null, location || null,
     supplier_id || null, supplier_name || null, customer_id || null, customer_name || null,
     work_order_id || null, work_order_no || null, production_date || null, expiry_date || null,
     extra_data ? JSON.stringify(extra_data) : null, remark || null]
  );

  return successResponse({ id: result.insertId, qr_code: qrCode }, '二维码生成成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, action, status, remark } = body;

  if (!id) return errorResponse('ID不能为空', 400, 400);

  if (action === 'print') {
    await execute(
      'UPDATE qrcode_record SET print_count = print_count + 1, last_print_time = NOW() WHERE id = ? AND deleted = 0',
      [id]
    );
    return successResponse(null, '打印记录已更新');
  }

  if (action === 'scan') {
    const { scan_type, operator_id, operator_name, scan_result, scan_message, scan_data, device_info } = body;
    const record: any = await queryOne('SELECT * FROM qrcode_record WHERE id = ? AND deleted = 0', [id]);
    if (!record) return errorResponse('二维码记录不存在', 404, 404);

    await execute(
      'UPDATE qrcode_record SET scan_count = scan_count + 1, last_scan_time = NOW() WHERE id = ?',
      [id]
    );

    await execute(
      `INSERT INTO qrcode_scan_log (qr_code, qr_type, scan_type, ref_id, ref_no, operator_id, operator_name, scan_result, scan_message, scan_data, device_info)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [record.qr_code, record.qr_type, scan_type || 'trace', record.ref_id, record.ref_no,
       operator_id || null, operator_name || null, scan_result || 'success', scan_message || null,
       scan_data ? JSON.stringify(scan_data) : null, device_info || null]
    );

    return successResponse(null, '扫描记录已保存');
  }

  if (action === 'invalidate') {
    await execute('UPDATE qrcode_record SET status = 3 WHERE id = ? AND deleted = 0', [id]);
    return successResponse(null, '二维码已失效');
  }

  if (action === 'void') {
    await execute('UPDATE qrcode_record SET status = 9 WHERE id = ? AND deleted = 0', [id]);
    return successResponse(null, '二维码已作废');
  }

  const fields: string[] = [];
  const values: any[] = [];
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }
  if (remark !== undefined) { fields.push('remark = ?'); values.push(remark); }
  if (fields.length === 0) return errorResponse('没有需要更新的字段', 400, 400);
  values.push(id);
  await execute(`UPDATE qrcode_record SET ${fields.join(', ')} WHERE id = ? AND deleted = 0`, values);
  return successResponse(null, '更新成功');
});
