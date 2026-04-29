import { NextRequest } from 'next/server';
import { query, queryPaginated } from '@/lib/db';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody,
} from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status') || '';
  const supplierType = searchParams.get('supplier_type') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  let sql = `
    SELECT
      id,
      supplier_code,
      supplier_name,
      short_name,
      supplier_type,
      contact_name,
      contact_phone,
      contact_email,
      address,
      credit_level,
      cooperation_status,
      settlement_method,
      payment_terms,
      status,
      remark,
      create_time,
      update_time
    FROM pur_supplier
    WHERE deleted = 0
  `;

  let countSql = `SELECT COUNT(*) as total FROM pur_supplier WHERE deleted = 0`;
  const params: any[] = [];

  if (keyword) {
    const keywordCondition = ` AND (supplier_code LIKE ? OR supplier_name LIKE ? OR short_name LIKE ?)`;
    sql += keywordCondition;
    countSql += keywordCondition;
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  if (status) {
    sql += ` AND status = ?`;
    countSql += ` AND status = ?`;
    params.push(parseInt(status));
  }

  if (supplierType) {
    sql += ` AND supplier_type = ?`;
    countSql += ` AND supplier_type = ?`;
    params.push(parseInt(supplierType));
  }

  sql += ` ORDER BY create_time DESC`;

  const result = await queryPaginated(sql, countSql, params, { page, pageSize });
  return paginatedResponse(result.data, result.pagination);
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  const validation = validateRequestBody(body, [
    'supplier_code',
    'supplier_name',
  ]);

  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  const {
    supplier_code,
    supplier_name,
    short_name,
    supplier_type,
    contact_name,
    contact_phone,
    contact_email,
    address,
    credit_level,
    settlement_method,
    payment_terms,
    remark,
  } = body;

  const existing = await query(
    'SELECT id FROM pur_supplier WHERE supplier_code = ? AND deleted = 0',
    [supplier_code]
  );

  if ((existing as any[]).length > 0) {
    return errorResponse('供应商编码已存在', 400, 400);
  }

  const result = await query(
    `INSERT INTO pur_supplier 
     (supplier_code, supplier_name, short_name, supplier_type, contact_name, contact_phone, 
      contact_email, address, credit_level, settlement_method, payment_terms, status, remark, create_time) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())`,
    [
      supplier_code,
      supplier_name,
      short_name || '',
      supplier_type || 1,
      contact_name || '',
      contact_phone || '',
      contact_email || '',
      address || '',
      credit_level || '',
      settlement_method || '',
      payment_terms || '',
      remark || '',
    ]
  );

  return successResponse({ id: (result as any).insertId, supplier_code }, '供应商创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, ...updateData } = body;

  if (!id) {
    return errorResponse('供应商ID不能为空', 400, 400);
  }

  const existing = await query(
    'SELECT id FROM pur_supplier WHERE id = ? AND deleted = 0',
    [id]
  );

  if ((existing as any[]).length === 0) {
    return commonErrors.notFound('供应商不存在');
  }

  const fieldMapping: { [key: string]: string } = {
    supplier_code: 'supplier_code',
    supplier_name: 'supplier_name',
    short_name: 'short_name',
    supplier_type: 'supplier_type',
    contact_name: 'contact_name',
    contact_phone: 'contact_phone',
    contact_email: 'contact_email',
    address: 'address',
    credit_level: 'credit_level',
    cooperation_status: 'cooperation_status',
    settlement_method: 'settlement_method',
    payment_terms: 'payment_terms',
    status: 'status',
    remark: 'remark',
  };

  const updateFields: string[] = [];
  const updateParams: any[] = [];

  for (const [key, value] of Object.entries(updateData)) {
    if (fieldMapping[key] && value !== undefined) {
      updateFields.push(`${fieldMapping[key]} = ?`);
      updateParams.push(value);
    }
  }

  if (updateFields.length === 0) {
    return errorResponse('没有要更新的字段', 400, 400);
  }

  updateParams.push(id);
  await query(
    `UPDATE pur_supplier SET ${updateFields.join(', ')}, update_time = NOW() WHERE id = ?`,
    updateParams
  );

  return successResponse({ id }, '供应商更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return errorResponse('供应商ID不能为空', 400, 400);
  }

  const existing = await query(
    'SELECT id FROM pur_supplier WHERE id = ? AND deleted = 0',
    [id]
  );

  if ((existing as any[]).length === 0) {
    return commonErrors.notFound('供应商不存在');
  }

  await query(
    'UPDATE pur_supplier SET deleted = 1, update_time = NOW() WHERE id = ?',
    [id]
  );

  return successResponse(null, '供应商删除成功');
});
