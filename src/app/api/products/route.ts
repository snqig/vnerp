import { NextRequest } from 'next/server';
import { query, execute, transaction, queryPaginated } from '@/lib/db';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody,
} from '@/lib/api-response';

// 获取产品列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const categoryId = searchParams.get('categoryId') || '';
  const status = searchParams.get('status') || '';
  const customerId = searchParams.get('customerId') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  // 基础查询SQL
  let sql = `
    SELECT
      p.id,
      p.product_code,
      p.product_name,
      p.short_name,
      p.specification,
      p.unit,
      p.category_id,
      p.category_name,
      p.customer_id,
      p.customer_name,
      p.bom_version,
      p.description,
      p.status,
      p.cost_price,
      p.sale_price,
      p.min_stock,
      p.max_stock,
      p.safety_stock,
      p.create_time,
      p.update_time
    FROM mdm_product p
    WHERE p.deleted = 0
  `;

  let countSql = `SELECT COUNT(*) as total FROM mdm_product p WHERE p.deleted = 0`;
  const params: any[] = [];

  if (keyword) {
    const keywordCondition = ` AND (p.product_code LIKE ? OR p.product_name LIKE ? OR p.short_name LIKE ?)`;
    sql += keywordCondition;
    countSql += keywordCondition;
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  if (categoryId) {
    sql += ` AND p.category_id = ?`;
    countSql += ` AND p.category_id = ?`;
    params.push(categoryId);
  }

  if (status) {
    sql += ` AND p.status = ?`;
    countSql += ` AND p.status = ?`;
    params.push(status);
  }

  if (customerId) {
    sql += ` AND p.customer_id = ?`;
    countSql += ` AND p.customer_id = ?`;
    params.push(customerId);
  }

  sql += ` ORDER BY p.create_time DESC`;

  // 使用分页查询工具
  const result = await queryPaginated(sql, countSql, params, { page, pageSize });

  return paginatedResponse(result.data, result.pagination);
});

// 创建产品
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  // 验证必填字段
  const validation = validateRequestBody(body, [
    'productCode',
    'productName',
    'categoryId',
  ]);

  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  const {
    product_code,
    product_name,
    short_name,
    specification,
    unit,
    category_id,
    category_name,
    customer_id,
    customer_name,
    bom_version,
    description,
    cost_price,
    sale_price,
    min_stock,
    max_stock,
    safety_stock,
  } = body;

  const existingProducts = await query(
    'SELECT id FROM mdm_product WHERE product_code = ? AND deleted = 0',
    [product_code]
  );

  if ((existingProducts as any[]).length > 0) {
    return errorResponse('产品编码已存在', 400, 400);
  }

  const result = await query(
    `INSERT INTO mdm_product 
     (product_code, product_name, short_name, specification, unit, category_id, category_name, 
      customer_id, customer_name, bom_version, description, status, cost_price, sale_price, 
      min_stock, max_stock, safety_stock, create_time) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, NOW())`,
    [
      product_code,
      product_name,
      short_name || '',
      specification || '',
      unit || '件',
      category_id,
      category_name || '',
      customer_id || null,
      customer_name || '',
      bom_version || 'V1.0',
      description || '',
      cost_price || 0,
      sale_price || 0,
      min_stock || 0,
      max_stock || 0,
      safety_stock || 0,
    ]
  );

  const insertId = (result as any).insertId;

  return successResponse({ id: insertId, product_code }, '产品创建成功');
}, '创建产品失败');

// 更新产品
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, ...updateData } = body;

  if (!id) {
    return errorResponse('产品ID不能为空', 400, 400);
  }

  // 查询产品
  const products = await query(
    'SELECT * FROM mdm_product WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!products || (products as any[]).length === 0) {
    return commonErrors.notFound('产品不存在');
  }

  const updateFields: string[] = [];
  const updateParams: any[] = [];

  const fieldMapping: { [key: string]: string } = {
    product_name: 'product_name',
    short_name: 'short_name',
    specification: 'specification',
    unit: 'unit',
    category_id: 'category_id',
    category_name: 'category_name',
    customer_id: 'customer_id',
    customer_name: 'customer_name',
    bom_version: 'bom_version',
    description: 'description',
    status: 'status',
    cost_price: 'cost_price',
    sale_price: 'sale_price',
    min_stock: 'min_stock',
    max_stock: 'max_stock',
    safety_stock: 'safety_stock',
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
    `UPDATE mdm_product SET ${updateFields.join(', ')}, update_time = NOW() WHERE id = ?`,
    updateParams
  );

  return successResponse({ id }, '产品更新成功');
}, '更新产品失败');

// 删除产品
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return errorResponse('产品ID不能为空', 400, 400);
  }

  // 查询产品
  const products = await query(
    'SELECT * FROM mdm_product WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!products || (products as any[]).length === 0) {
    return commonErrors.notFound('产品不存在');
  }

  // 软删除
  await query(
    'UPDATE mdm_product SET deleted = 1, update_time = NOW() WHERE id = ?',
    [id]
  );

  return successResponse(null, '产品删除成功');
}, '删除产品失败');
