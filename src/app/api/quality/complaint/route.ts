import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const complaintNo = searchParams.get('complaintNo') || '';
  const customerName = searchParams.get('customerName') || '';
  const productName = searchParams.get('productName') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE deleted = 0';
  const params: any[] = [];
  if (complaintNo) { where += ' AND complaint_no LIKE ?'; params.push('%' + complaintNo + '%'); }
  if (customerName) { where += ' AND customer_name LIKE ?'; params.push('%' + customerName + '%'); }
  if (productName) { where += ' AND product_name LIKE ?'; params.push('%' + productName + '%'); }
  if (status !== '') { where += ' AND status = ?'; params.push(Number(status)); }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM qms_complaint ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query('SELECT * FROM qms_complaint ' + where + ' ORDER BY create_time DESC LIMIT ? OFFSET ?', [...params, pageSize, (page - 1) * pageSize]);
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { complaint_source, customer_id, customer_name, product_id, product_code, product_name, order_no, defect_date, defect_qty, defect_desc, defect_type, severity, reporter, report_date, remark } = body;

  if (!customer_name) return errorResponse('客户名称不能为空', 400, 400);
  if (!product_name) return errorResponse('产品名称不能为空', 400, 400);

  const now = new Date();
  const complaintNo = 'CP' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const result: any = await execute(
    `INSERT INTO qms_complaint (complaint_no, complaint_source, customer_id, customer_name, product_id, product_code, product_name, order_no, defect_date, defect_qty, defect_desc, defect_type, severity, reporter, report_date, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [complaintNo, complaint_source || 'customer', customer_id || null, customer_name, product_id || null, product_code || null, product_name, order_no || null, defect_date || null, defect_qty || 0, defect_desc || null, defect_type || 'other', severity || 2, reporter || null, report_date || null, remark || null]
  );

  return successResponse({ id: result.insertId, complaint_no: complaintNo }, '客诉记录创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, complaint_source, customer_id, customer_name, product_id, product_code, product_name, order_no, defect_date, defect_qty, defect_desc, defect_type, severity, reporter, report_date, d1_team, d2_desc, d3_interim_action, d4_root_cause, d5_corrective_action, d6_implement_verify, d7_preventive_action, d8_congratulations, d1_date, d2_date, d3_date, d4_date, d5_date, d6_date, d7_date, d8_date, status, remark } = body;

  if (!id) return errorResponse('ID不能为空', 400, 400);

  const fields: string[] = [];
  const values: any[] = [];

  if (complaint_source !== undefined) { fields.push('complaint_source = ?'); values.push(complaint_source); }
  if (customer_id !== undefined) { fields.push('customer_id = ?'); values.push(customer_id); }
  if (customer_name !== undefined) { fields.push('customer_name = ?'); values.push(customer_name); }
  if (product_id !== undefined) { fields.push('product_id = ?'); values.push(product_id); }
  if (product_code !== undefined) { fields.push('product_code = ?'); values.push(product_code); }
  if (product_name !== undefined) { fields.push('product_name = ?'); values.push(product_name); }
  if (order_no !== undefined) { fields.push('order_no = ?'); values.push(order_no); }
  if (defect_date !== undefined) { fields.push('defect_date = ?'); values.push(defect_date); }
  if (defect_qty !== undefined) { fields.push('defect_qty = ?'); values.push(defect_qty); }
  if (defect_desc !== undefined) { fields.push('defect_desc = ?'); values.push(defect_desc); }
  if (defect_type !== undefined) { fields.push('defect_type = ?'); values.push(defect_type); }
  if (severity !== undefined) { fields.push('severity = ?'); values.push(severity); }
  if (reporter !== undefined) { fields.push('reporter = ?'); values.push(reporter); }
  if (report_date !== undefined) { fields.push('report_date = ?'); values.push(report_date); }
  if (d1_team !== undefined) { fields.push('d1_team = ?'); values.push(d1_team); }
  if (d2_desc !== undefined) { fields.push('d2_desc = ?'); values.push(d2_desc); }
  if (d3_interim_action !== undefined) { fields.push('d3_interim_action = ?'); values.push(d3_interim_action); }
  if (d4_root_cause !== undefined) { fields.push('d4_root_cause = ?'); values.push(d4_root_cause); }
  if (d5_corrective_action !== undefined) { fields.push('d5_corrective_action = ?'); values.push(d5_corrective_action); }
  if (d6_implement_verify !== undefined) { fields.push('d6_implement_verify = ?'); values.push(d6_implement_verify); }
  if (d7_preventive_action !== undefined) { fields.push('d7_preventive_action = ?'); values.push(d7_preventive_action); }
  if (d8_congratulations !== undefined) { fields.push('d8_congratulations = ?'); values.push(d8_congratulations); }
  if (d1_date !== undefined) { fields.push('d1_date = ?'); values.push(d1_date); }
  if (d2_date !== undefined) { fields.push('d2_date = ?'); values.push(d2_date); }
  if (d3_date !== undefined) { fields.push('d3_date = ?'); values.push(d3_date); }
  if (d4_date !== undefined) { fields.push('d4_date = ?'); values.push(d4_date); }
  if (d5_date !== undefined) { fields.push('d5_date = ?'); values.push(d5_date); }
  if (d6_date !== undefined) { fields.push('d6_date = ?'); values.push(d6_date); }
  if (d7_date !== undefined) { fields.push('d7_date = ?'); values.push(d7_date); }
  if (d8_date !== undefined) { fields.push('d8_date = ?'); values.push(d8_date); }
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }
  if (remark !== undefined) { fields.push('remark = ?'); values.push(remark); }

  if (fields.length === 0) return errorResponse('没有需要更新的字段', 400, 400);

  values.push(id);
  await execute('UPDATE qms_complaint SET ' + fields.join(', ') + ' WHERE id = ?', values);
  return successResponse(null, '客诉记录更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return errorResponse('ID不能为空', 400, 400);

  await execute('UPDATE qms_complaint SET deleted = 1 WHERE id = ?', [id]);
  return successResponse(null, '客诉记录删除成功');
});
