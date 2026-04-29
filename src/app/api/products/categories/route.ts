import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  withErrorHandler,
} from '@/lib/api-response';

// 获取产品分类列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get('parentId');

  let sql = `
    SELECT
      id,
      category_code as categoryCode,
      category_name as categoryName,
      parent_id as parentId,
      level,
      sort_order as sortOrder,
      description,
      status,
      create_time as createTime
    FROM mdm_product_category
    WHERE deleted = 0
  `;

  const params: any[] = [];

  if (parentId !== null) {
    sql += ` AND parent_id = ?`;
    params.push(parentId);
  }

  sql += ` ORDER BY sort_order ASC, create_time DESC`;

  const categories = await query(sql, params);

  return successResponse(categories);
});

// 创建产品分类
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { categoryCode, categoryName, parentId = 0, level = 1, sortOrder = 0, description } = body;

  if (!categoryCode || !categoryName) {
    return errorResponse('分类编码和名称不能为空', 400, 400);
  }

  // 检查分类编码是否已存在
  const existingCategories = await query(
    'SELECT id FROM mdm_product_category WHERE category_code = ? AND deleted = 0',
    [categoryCode]
  );

  if ((existingCategories as any[]).length > 0) {
    return errorResponse('分类编码已存在', 400, 400);
  }

  const result = await query(
    `INSERT INTO mdm_product_category 
     (category_code, category_name, parent_id, level, sort_order, description, status, create_time) 
     VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`,
    [categoryCode, categoryName, parentId, level, sortOrder, description || '']
  );

  const insertId = (result as any).insertId;

  return successResponse({ id: insertId, categoryCode }, '产品分类创建成功');
}, '创建产品分类失败');

// 更新产品分类
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, categoryName, sortOrder, description, status } = body;

  if (!id) {
    return errorResponse('分类ID不能为空', 400, 400);
  }

  const updateFields: string[] = [];
  const updateParams: any[] = [];

  if (categoryName !== undefined) {
    updateFields.push('category_name = ?');
    updateParams.push(categoryName);
  }

  if (sortOrder !== undefined) {
    updateFields.push('sort_order = ?');
    updateParams.push(sortOrder);
  }

  if (description !== undefined) {
    updateFields.push('description = ?');
    updateParams.push(description);
  }

  if (status !== undefined) {
    updateFields.push('status = ?');
    updateParams.push(status);
  }

  if (updateFields.length === 0) {
    return errorResponse('没有要更新的字段', 400, 400);
  }

  updateParams.push(id);
  await query(
    `UPDATE mdm_product_category SET ${updateFields.join(', ')}, update_time = NOW() WHERE id = ?`,
    updateParams
  );

  return successResponse({ id }, '产品分类更新成功');
}, '更新产品分类失败');

// 删除产品分类
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return errorResponse('分类ID不能为空', 400, 400);
  }

  // 检查是否有子分类
  const childCategories = await query(
    'SELECT id FROM mdm_product_category WHERE parent_id = ? AND deleted = 0',
    [id]
  );

  if ((childCategories as any[]).length > 0) {
    return errorResponse('该分类下有子分类，不能删除', 400, 400);
  }

  // 检查是否有关联产品
  const products = await query(
    'SELECT id FROM mdm_product WHERE category_id = ? AND deleted = 0',
    [id]
  );

  if ((products as any[]).length > 0) {
    return errorResponse('该分类下有关联产品，不能删除', 400, 400);
  }

  // 软删除
  await query(
    'UPDATE mdm_product_category SET deleted = 1, update_time = NOW() WHERE id = ?',
    [id]
  );

  return successResponse(null, '产品分类删除成功');
}, '删除产品分类失败');
