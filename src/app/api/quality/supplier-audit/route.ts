import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const auditNo = searchParams.get('auditNo') || '';
  const supplierName = searchParams.get('supplierName') || '';
  const auditType = searchParams.get('auditType') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE deleted = 0';
  const params: any[] = [];
  if (auditNo) { where += ' AND audit_no LIKE ?'; params.push('%' + auditNo + '%'); }
  if (supplierName) { where += ' AND supplier_name LIKE ?'; params.push('%' + supplierName + '%'); }
  if (auditType) { where += ' AND audit_type = ?'; params.push(auditType); }
  if (status !== '') { where += ' AND status = ?'; params.push(Number(status)); }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM qms_supplier_audit ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query('SELECT * FROM qms_supplier_audit ' + where + ' ORDER BY create_time DESC LIMIT ? OFFSET ?', [...params, pageSize, (page - 1) * pageSize]);
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { supplier_id, supplier_name, audit_type, audit_date, auditor, audit_scope, quality_system_score, delivery_score, price_score, service_score, total_score, audit_result, improvement_items, follow_up_date, remark } = body;

  if (!supplier_name) return errorResponse('供应商名称不能为空', 400, 400);

  const now = new Date();
  const auditNo = 'SA' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const result: any = await execute(
    `INSERT INTO qms_supplier_audit (audit_no, supplier_id, supplier_name, audit_type, audit_date, auditor, audit_scope, quality_system_score, delivery_score, price_score, service_score, total_score, audit_result, improvement_items, follow_up_date, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [auditNo, supplier_id || null, supplier_name, audit_type || 'initial', audit_date || null, auditor || null, audit_scope || null, quality_system_score || 0, delivery_score || 0, price_score || 0, service_score || 0, total_score || 0, audit_result || 'pending', improvement_items || null, follow_up_date || null, remark || null]
  );

  return successResponse({ id: result.insertId, audit_no: auditNo }, '供应商审核记录创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, supplier_id, supplier_name, audit_type, audit_date, auditor, audit_scope, quality_system_score, delivery_score, price_score, service_score, total_score, audit_result, improvement_items, follow_up_date, status, remark } = body;

  if (!id) return errorResponse('ID不能为空', 400, 400);

  const fields: string[] = [];
  const values: any[] = [];

  if (supplier_id !== undefined) { fields.push('supplier_id = ?'); values.push(supplier_id); }
  if (supplier_name !== undefined) { fields.push('supplier_name = ?'); values.push(supplier_name); }
  if (audit_type !== undefined) { fields.push('audit_type = ?'); values.push(audit_type); }
  if (audit_date !== undefined) { fields.push('audit_date = ?'); values.push(audit_date); }
  if (auditor !== undefined) { fields.push('auditor = ?'); values.push(auditor); }
  if (audit_scope !== undefined) { fields.push('audit_scope = ?'); values.push(audit_scope); }
  if (quality_system_score !== undefined) { fields.push('quality_system_score = ?'); values.push(quality_system_score); }
  if (delivery_score !== undefined) { fields.push('delivery_score = ?'); values.push(delivery_score); }
  if (price_score !== undefined) { fields.push('price_score = ?'); values.push(price_score); }
  if (service_score !== undefined) { fields.push('service_score = ?'); values.push(service_score); }
  if (total_score !== undefined) { fields.push('total_score = ?'); values.push(total_score); }
  if (audit_result !== undefined) { fields.push('audit_result = ?'); values.push(audit_result); }
  if (improvement_items !== undefined) { fields.push('improvement_items = ?'); values.push(improvement_items); }
  if (follow_up_date !== undefined) { fields.push('follow_up_date = ?'); values.push(follow_up_date); }
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }
  if (remark !== undefined) { fields.push('remark = ?'); values.push(remark); }

  if (fields.length === 0) return errorResponse('没有需要更新的字段', 400, 400);

  values.push(id);
  await execute('UPDATE qms_supplier_audit SET ' + fields.join(', ') + ' WHERE id = ?', values);
  return successResponse(null, '供应商审核记录更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return errorResponse('ID不能为空', 400, 400);

  await execute('UPDATE qms_supplier_audit SET deleted = 1 WHERE id = ?', [id]);
  return successResponse(null, '供应商审核记录删除成功');
});
