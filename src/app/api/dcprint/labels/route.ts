import { NextRequest } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  withErrorHandler,
  validateRequestBody,
} from '@/lib/api-response';

// 物料标签接口
interface MaterialLabel {
  id: number;
  labelNo: string;
  qrCode?: string;
  purchaseOrderNo?: string;
  supplierName?: string;
  receiveDate?: string;
  materialCode: string;
  materialName?: string;
  specification?: string;
  unit?: string;
  batchNo?: string;
  quantity: number;
  packageQty?: number;
  width?: number;
  lengthPerRoll?: number;
  remark?: string;
  colorCode?: string;
  mixRemark?: string;
  warehouseId?: number;
  locationId?: number;
  warehouseName?: string;
  locationName?: string;
  isMainMaterial: number;
  isUsed: number;
  isCut: number;
  parentLabelId?: number;
  parentLabelNo?: string;
  status: string;
  createTime?: string;
  updateTime?: string;
}

// GET - 获取物料标签列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const materialCode = searchParams.get('materialCode') || '';
  const batchNo = searchParams.get('batchNo') || '';
  const purchaseOrderNo = searchParams.get('purchaseOrderNo') || '';
  const supplierName = searchParams.get('supplierName') || '';
  const warehouseId = searchParams.get('warehouseId') || '';
  const isMainMaterial = searchParams.get('isMainMaterial') || '';
  const isUsed = searchParams.get('isUsed') || '';
  const isCut = searchParams.get('isCut') || '';
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  let whereClause = 'WHERE l.deleted = 0';
  const params: any[] = [];

  if (keyword) {
    whereClause += ` AND (l.label_no LIKE ? OR l.material_code LIKE ? OR l.material_name LIKE ? OR l.batch_no LIKE ?)`;
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  if (materialCode) {
    whereClause += ` AND l.material_code = ?`;
    params.push(materialCode);
  }

  if (batchNo) {
    whereClause += ` AND l.batch_no = ?`;
    params.push(batchNo);
  }

  if (purchaseOrderNo) {
    whereClause += ` AND l.purchase_order_no = ?`;
    params.push(purchaseOrderNo);
  }

  if (supplierName) {
    whereClause += ` AND l.supplier_name LIKE ?`;
    params.push(`%${supplierName}%`);
  }

  if (warehouseId) {
    whereClause += ` AND l.warehouse_id = ?`;
    params.push(warehouseId);
  }

  if (isMainMaterial !== '') {
    whereClause += ` AND l.is_main_material = ?`;
    params.push(isMainMaterial === '1' ? 1 : 0);
  }

  if (isUsed !== '') {
    whereClause += ` AND l.is_used = ?`;
    params.push(isUsed === '1' ? 1 : 0);
  }

  if (isCut !== '') {
    whereClause += ` AND l.is_cut = ?`;
    params.push(isCut === '1' ? 1 : 0);
  }

  if (status) {
    whereClause += ` AND l.status = ?`;
    params.push(status);
  }

  const result = await queryPaginated<MaterialLabel>(
    `SELECT
      l.id,
      l.label_no as labelNo,
      l.qr_code as qrCode,
      l.purchase_order_no as purchaseOrderNo,
      l.supplier_name as supplierName,
      l.receive_date as receiveDate,
      l.material_code as materialCode,
      l.material_name as materialName,
      l.specification,
      l.unit,
      l.batch_no as batchNo,
      l.quantity,
      l.package_qty as packageQty,
      l.width,
      l.length_per_roll as lengthPerRoll,
      l.remark,
      l.color_code as colorCode,
      l.mix_remark as mixRemark,
      l.warehouse_id as warehouseId,
      l.location_id as locationId,
      NULL as warehouseName,
      NULL as locationName,
      l.is_main_material as isMainMaterial,
      l.is_used as isUsed,
      l.is_cut as isCut,
      l.parent_label_id as parentLabelId,
      pl.label_no as parentLabelNo,
      l.status,
      l.create_time as createTime,
      l.update_time as updateTime
    FROM inv_material_label l
    LEFT JOIN inv_material_label pl ON l.parent_label_id = pl.id
    ${whereClause}
    ORDER BY l.create_time DESC`,
    `SELECT COUNT(*) as total FROM inv_material_label l ${whereClause}`,
    params,
    { page, pageSize }
  );

  return successResponse(result);
}, '获取物料标签列表失败');

// POST - 创建物料标签
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  // 验证必填字段
  const validation = validateRequestBody(body, [
    'labelNo',
    'materialCode',
  ]);

  if (!validation.valid) {
    return errorResponse(
      `缺少必填字段: ${validation.missing.join(', ')}`,
      400,
      400
    );
  }

  const {
    labelNo,
    qrCode,
    purchaseOrderNo,
    supplierName,
    receiveDate,
    materialCode,
    materialName,
    specification,
    unit,
    batchNo,
    quantity,
    packageQty,
    width,
    lengthPerRoll,
    remark,
    colorCode,
    mixRemark,
    warehouseId,
    locationId,
    isMainMaterial = 1,
    parentLabelId,
  } = body;

  // 生成二维码内容（如果没有提供）
  const finalQrCode = qrCode || JSON.stringify({
    ID: labelNo,
    TYPE: parentLabelId ? '1' : '0', // 0-母材, 1-分切后
  });

  // 插入数据
  const result = await execute(
    `INSERT INTO inv_material_label (
      label_no, qr_code, purchase_order_no, supplier_name, receive_date,
      material_code, material_name, specification, unit, batch_no,
      quantity, package_qty, width, length_per_roll, remark,
      color_code, mix_remark, warehouse_id, location_id,
      is_main_material, parent_label_id, status, deleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0)`,
    [
      labelNo, finalQrCode, purchaseOrderNo, supplierName, receiveDate,
      materialCode, materialName, specification, unit, batchNo,
      quantity, packageQty, width, lengthPerRoll, remark,
      colorCode, mixRemark, warehouseId, locationId,
      isMainMaterial ? 1 : 0, parentLabelId,
    ]
  );

  return successResponse({
    id: result.insertId,
    labelNo,
    message: '物料标签创建成功',
  }, '物料标签创建成功');
}, '创建物料标签失败');

// PUT - 更新物料标签
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  if (!body.id) {
    return errorResponse('缺少标签ID', 400, 400);
  }

  const updateFields: string[] = [];
  const params: any[] = [];

  const fields = [
    'qrCode', 'purchaseOrderNo', 'supplierName', 'receiveDate',
    'materialCode', 'materialName', 'specification', 'unit', 'batchNo',
    'quantity', 'packageQty', 'width', 'lengthPerRoll', 'remark',
    'colorCode', 'mixRemark', 'warehouseId', 'locationId',
    'isMainMaterial', 'isUsed', 'isCut', 'status',
  ];

  fields.forEach((field) => {
    if (body[field] !== undefined) {
      updateFields.push(`${snakeCase(field)} = ?`);
      params.push(body[field]);
    }
  });

  if (updateFields.length === 0) {
    return errorResponse('没有要更新的字段', 400, 400);
  }

  params.push(body.id);

  await execute(
    `UPDATE inv_material_label SET ${updateFields.join(', ')} WHERE id = ? AND deleted = 0`,
    params
  );

  return successResponse(null, '物料标签更新成功');
}, '更新物料标签失败');

// DELETE - 删除物料标签（软删除）
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return errorResponse('缺少标签ID', 400, 400);
  }

  await execute(
    'UPDATE inv_material_label SET deleted = 1 WHERE id = ?',
    [id]
  );

  return successResponse(null, '物料标签删除成功');
}, '删除物料标签失败');

// 辅助函数：驼峰转蛇形
function snakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

// 辅助函数：分页查询
async function queryPaginated<T>(
  sql: string,
  countSql: string,
  params: any[],
  pagination: { page: number; pageSize: number }
) {
  const { page, pageSize } = pagination;
  const offset = (page - 1) * pageSize;

  try {
    const [data, countResult] = await Promise.all([
      query<T[]>(`${sql} LIMIT ${pageSize} OFFSET ${offset}`, params),
      queryOne<{ total: number }>(countSql, params),
    ]);

    return {
      list: data || [],
      pagination: {
        page,
        pageSize,
        total: countResult?.total || 0,
      },
    };
  } catch (error) {
    console.error('分页查询失败:', error);
    return {
      list: [],
      pagination: {
        page,
        pageSize,
        total: 0,
      },
    };
  }
}
