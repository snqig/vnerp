import { NextRequest } from 'next/server';
import { query, transaction, queryPaginated } from '@/lib/db';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  withErrorHandler,
  validateRequestBody,
} from '@/lib/api-response';

/**
 * 获取物料列表
 * GET /api/orders/bom/materials
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const keyword = searchParams.get('keyword') || '';
  const materialType = searchParams.get('materialType') || '';
  const categoryId = searchParams.get('categoryId') || '';

  let whereClause = 'WHERE deleted = 0';
  const params: any[] = [];

  if (keyword) {
    whereClause += ' AND (material_code LIKE ? OR material_name LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (materialType) {
    whereClause += ' AND material_type = ?';
    params.push(materialType);
  }

  if (categoryId) {
    whereClause += ' AND category_id = ?';
    params.push(parseInt(categoryId));
  }

  const result = await queryPaginated(
    `SELECT 
       id, material_code, material_name, material_spec, material_type,
       category_id, category_name, unit, unit_cost, safety_stock,
       default_supplier_name, is_active
     FROM bom_material
     ${whereClause}
     ORDER BY create_time DESC`,
    params,
    page,
    pageSize
  );

  return paginatedResponse(result.data, result.pagination);
}, '获取物料列表失败');

/**
 * 创建物料
 * POST /api/orders/bom/materials
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  const validation = validateRequestBody(body, [
    'materialCode',
    'materialName',
  ]);

  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  const {
    materialCode,
    materialName,
    materialSpec,
    materialType = 'RAW',
    categoryId,
    categoryName,
    unit = '件',
    unitCost = 0,
    safetyStock = 0,
    defaultSupplierId,
    defaultSupplierName,
    shelfLifeDays,
    remark,
  } = body;

  // 检查物料编码是否已存在
  const existing = await query(
    'SELECT id FROM bom_material WHERE material_code = ? AND deleted = 0',
    [materialCode]
  );

  if ((existing as any[]).length > 0) {
    return errorResponse('物料编码已存在', 400, 400);
  }

  const result = await query(
    `INSERT INTO bom_material 
     (material_code, material_name, material_spec, material_type, category_id, category_name,
      unit, unit_cost, safety_stock, default_supplier_id, default_supplier_name, shelf_life_days, remark, create_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      materialCode,
      materialName,
      materialSpec || '',
      materialType,
      categoryId || null,
      categoryName || '',
      unit,
      unitCost,
      safetyStock,
      defaultSupplierId || null,
      defaultSupplierName || '',
      shelfLifeDays || null,
      remark || '',
    ]
  );

  return successResponse(
    { id: (result as any).insertId, materialCode },
    '物料创建成功'
  );
}, '创建物料失败');

/**
 * 更新物料
 * PUT /api/orders/bom/materials
 */
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, ...updateData } = body;

  if (!id) {
    return errorResponse('物料ID不能为空', 400, 400);
  }

  const material = await query(
    'SELECT id FROM bom_material WHERE id = ? AND deleted = 0',
    [id]
  );

  if ((material as any[]).length === 0) {
    return errorResponse('物料不存在', 404, 404);
  }

  const updateFields: string[] = [];
  const updateValues: any[] = [];

  if (updateData.materialName !== undefined) {
    updateFields.push('material_name = ?');
    updateValues.push(updateData.materialName);
  }
  if (updateData.materialSpec !== undefined) {
    updateFields.push('material_spec = ?');
    updateValues.push(updateData.materialSpec);
  }
  if (updateData.unit !== undefined) {
    updateFields.push('unit = ?');
    updateValues.push(updateData.unit);
  }
  if (updateData.unitCost !== undefined) {
    updateFields.push('unit_cost = ?');
    updateValues.push(updateData.unitCost);
  }
  if (updateData.safetyStock !== undefined) {
    updateFields.push('safety_stock = ?');
    updateValues.push(updateData.safetyStock);
  }
  if (updateData.isActive !== undefined) {
    updateFields.push('is_active = ?');
    updateValues.push(updateData.isActive ? 1 : 0);
  }
  if (updateData.remark !== undefined) {
    updateFields.push('remark = ?');
    updateValues.push(updateData.remark);
  }

  if (updateFields.length === 0) {
    return errorResponse('没有要更新的字段', 400, 400);
  }

  updateValues.push(id);
  await query(
    `UPDATE bom_material SET ${updateFields.join(', ')}, update_time = NOW() WHERE id = ?`,
    updateValues
  );

  return successResponse({ id }, '物料更新成功');
}, '更新物料失败');

/**
 * 删除物料
 * DELETE /api/orders/bom/materials?id={id}
 */
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return errorResponse('物料ID不能为空', 400, 400);
  }

  // 检查是否被BOM引用
  const usedInBom = await query(
    'SELECT 1 FROM bom_line WHERE material_id = ? LIMIT 1',
    [id]
  );

  if ((usedInBom as any[]).length > 0) {
    return errorResponse('该物料已被BOM引用，不能删除', 400, 400);
  }

  await query(
    'UPDATE bom_material SET deleted = 1, update_time = NOW() WHERE id = ?',
    [id]
  );

  return successResponse(null, '物料删除成功');
}, '删除物料失败');
