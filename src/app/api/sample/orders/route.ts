import { NextRequest } from 'next/server';
import { query, transaction, queryPaginated } from '@/lib/db';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody,
} from '@/lib/api-response';
import { generateDocumentNo } from '@/lib/document-numbering';

// 获取打样订单列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const customerName = searchParams.get('customerName') || '';
  const deliveryStatus = searchParams.get('deliveryStatus') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  // 基础查询SQL
  let sql = `
    SELECT
      id,
      order_no,
      notify_date,
      customer_name,
      product_name,
      material_no,
      version,
      size_spec,
      material_spec,
      quantity,
      customer_require_date,
      actual_delivery_date,
      delivery_status,
      remark,
      create_time,
      update_time
    FROM sal_sample_order
    WHERE deleted = 0
  `;

  let countSql = `SELECT COUNT(*) as total FROM sal_sample_order WHERE deleted = 0`;
  const params: any[] = [];

  if (keyword) {
    const keywordCondition = ` AND (order_no LIKE ? OR product_name LIKE ? OR material_no LIKE ?)`;
    sql += keywordCondition;
    countSql += keywordCondition;
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  if (customerName) {
    sql += ` AND customer_name = ?`;
    countSql += ` AND customer_name = ?`;
    params.push(customerName);
  }

  if (deliveryStatus) {
    sql += ` AND delivery_status = ?`;
    countSql += ` AND delivery_status = ?`;
    params.push(deliveryStatus);
  }

  if (startDate) {
    sql += ` AND notify_date >= ?`;
    countSql += ` AND notify_date >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    sql += ` AND notify_date <= ?`;
    countSql += ` AND notify_date <= ?`;
    params.push(endDate);
  }

  sql += ` ORDER BY notify_date DESC, id DESC`;

  // 使用分页查询工具
  const result = await queryPaginated(sql, countSql, params, { page, pageSize });

  return paginatedResponse(result.data, result.pagination);
});

// 创建打样订单
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  // 验证必填字段
  const validation = validateRequestBody(body, [
    'notify_date',
    'customer_name',
    'product_name',
    'material_no',
  ]);

  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  const {
    notify_date,
    customer_name,
    product_name,
    material_no,
    version,
    size_spec,
    material_spec,
    quantity,
    customer_require_date,
    remark,
  } = body;

  const orderNo = await generateDocumentNo('sample');

  const result = await query(
    `INSERT INTO sal_sample_order 
     (order_no, notify_date, customer_name, product_name, material_no, version, 
      size_spec, material_spec, quantity, customer_require_date, 
      delivery_status, remark, create_time) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())`,
    [
      orderNo,
      notify_date,
      customer_name,
      product_name,
      material_no,
      version || 'A',
      size_spec || '',
      material_spec || '',
      quantity || 0,
      customer_require_date || null,
      remark || '',
    ]
  );

  const insertId = (result as any).insertId;

  return successResponse({ id: insertId, order_no: orderNo }, '打样订单创建成功');
}, '创建打样订单失败');

// 更新打样订单
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, ...updateData } = body;

  if (!id) {
    return errorResponse('打样订单ID不能为空', 400, 400);
  }

  // 查询打样订单
  const orders = await query(
    'SELECT * FROM sal_sample_order WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!orders || (orders as any[]).length === 0) {
    return commonErrors.notFound('打样订单不存在');
  }

  const updateFields: string[] = [];
  const updateParams: any[] = [];

  const fieldMapping: { [key: string]: string } = {
    notify_date: 'notify_date',
    customer_name: 'customer_name',
    product_name: 'product_name',
    material_no: 'material_no',
    version: 'version',
    size_spec: 'size_spec',
    material_spec: 'material_spec',
    quantity: 'quantity',
    customer_require_date: 'customer_require_date',
    actual_delivery_date: 'actual_delivery_date',
    delivery_status: 'delivery_status',
    remark: 'remark',
  };

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
    `UPDATE sal_sample_order SET ${updateFields.join(', ')}, update_time = NOW() WHERE id = ?`,
    updateParams
  );

  return successResponse({ id }, '打样订单更新成功');
}, '更新打样订单失败');

// 删除打样订单
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return errorResponse('打样订单ID不能为空', 400, 400);
  }

  // 查询打样订单
  const orders = await query(
    'SELECT * FROM sal_sample_order WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!orders || (orders as any[]).length === 0) {
    return commonErrors.notFound('打样订单不存在');
  }

  // 软删除
  await query(
    'UPDATE sal_sample_order SET deleted = 1, update_time = NOW() WHERE id = ?',
    [id]
  );

  return successResponse(null, '打样订单删除成功');
}, '删除打样订单失败');
