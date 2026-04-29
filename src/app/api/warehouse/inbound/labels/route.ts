import { NextRequest } from 'next/server';
import { query, execute, queryOne, queryPaginated } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody,
} from '@/lib/api-response';

// 物料标签接口
interface InboundLabel {
  id: number;
  labelId: string;
  orderNo: string;
  purchaseOrderNo?: string;
  supplierName?: string;
  inboundDate?: string;
  warehouseCode?: string;
  materialCode: string;
  materialName: string;
  specification?: string;
  width?: number;
  batchNo?: string;
  qty: number;
  unit: string;
  isRawMaterial: number;
  packageQty?: number;
  labelQty?: number;
  labelStatus: string;
  auditStatus?: number;
  operatorName?: string;
  auditorName?: string;
  auditTime?: string;
  colorCode?: string;
  mixedMaterialRemark?: string;
  machineNo?: string;
  remark?: string;
  createTime?: string;
  updateTime?: string;
}

// GET - 获取物料标签列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status') || '';
  const materialCode = searchParams.get('materialCode') || '';
  const batchNo = searchParams.get('batchNo') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  let whereClause = 'WHERE l.deleted = 0';
  const params: any[] = [];

  if (keyword) {
    whereClause += ` AND (l.label_id LIKE ? OR l.material_code LIKE ? OR l.material_name LIKE ? OR l.supplier_name LIKE ?)`;
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  if (status) {
    whereClause += ` AND l.label_status = ?`;
    params.push(status);
  }

  if (materialCode) {
    whereClause += ` AND l.material_code = ?`;
    params.push(materialCode);
  }

  if (batchNo) {
    whereClause += ` AND l.batch_no = ?`;
    params.push(batchNo);
  }

  const result = await queryPaginated<InboundLabel>(
    `SELECT
      l.id,
      l.label_id as labelId,
      l.order_no as orderNo,
      l.purchase_order_no as purchaseOrderNo,
      l.supplier_name as supplierName,
      l.inbound_date as inboundDate,
      l.warehouse_code as warehouseCode,
      l.material_code as materialCode,
      l.material_name as materialName,
      l.specification,
      l.width,
      l.batch_no as batchNo,
      l.qty,
      l.unit,
      l.is_raw_material as isRawMaterial,
      l.package_qty as packageQty,
      l.label_qty as labelQty,
      l.label_status as labelStatus,
      l.audit_status as auditStatus,
      l.operator_name as operatorName,
      l.auditor_name as auditorName,
      l.audit_time as auditTime,
      l.color_code as colorCode,
      l.mixed_material_remark as mixedMaterialRemark,
      l.machine_no as machineNo,
      l.remark,
      l.create_time as createTime,
      l.update_time as updateTime
    FROM inv_inbound_label l
    ${whereClause}
    ORDER BY l.create_time DESC`,
    `SELECT COUNT(*) as total FROM inv_inbound_label l ${whereClause}`,
    params,
    { page, pageSize }
  );

  return successResponse(result);
}, '获取物料标签列表失败');

// POST - 生成物料标签
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  // 验证必填字段
  const validation = validateRequestBody(body, [
    'orderId',
    'materialCode',
    'materialName',
    'qty',
    'unit',
    'operatorId',
    'operatorName',
  ]);

  if (!validation.valid) {
    return errorResponse(
      `缺少必填字段: ${validation.missing.join(', ')}`,
      400,
      400
    );
  }

  const {
    orderId,
    orderNo,
    itemId,
    purchaseOrderNo,
    supplierName,
    inboundDate,
    warehouseCode,
    materialCode,
    materialName,
    specification,
    width,
    batchNo,
    qty,
    unit,
    isRawMaterial,
    packageQty,
    labelQty,
    colorCode,
    mixedMaterialRemark,
    machineNo,
    remark,
    operatorId,
    operatorName,
  } = body;

  // 生成标签ID
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const maxLabel = await queryOne<{ maxId: string }>(
    `SELECT MAX(label_id) as maxId FROM inv_inbound_label WHERE label_id LIKE ?`,
    [`${dateStr}%`]
  );
  const seq = maxLabel?.maxId
    ? String(parseInt(maxLabel.maxId.slice(-5)) + 1).padStart(5, '0')
    : '00001';
  const labelId = `${dateStr}${seq}`;

  await execute(
    `INSERT INTO inv_inbound_label (
      label_id, order_id, order_no, item_id, purchase_order_no, supplier_name,
      inbound_date, warehouse_code, material_code, material_name, specification,
      width, batch_no, qty, unit, is_raw_material, package_qty, label_qty,
      label_status, operator_id, operator_name, color_code, mixed_material_remark,
      machine_no, remark
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'generated', ?, ?, ?, ?, ?, ?)`,
    [
      labelId,
      orderId,
      orderNo || null,
      itemId || null,
      purchaseOrderNo || null,
      supplierName || null,
      inboundDate || null,
      warehouseCode || null,
      materialCode,
      materialName,
      specification || null,
      width || 0,
      batchNo || null,
      qty,
      unit,
      isRawMaterial ? 1 : 0,
      packageQty || 0,
      labelQty || 1,
      operatorId,
      operatorName,
      colorCode || null,
      mixedMaterialRemark || null,
      machineNo || null,
      remark || null,
    ]
  );

  return successResponse({ labelId }, '物料标签生成成功');
}, '生成物料标签失败');

// PUT - 更新标签状态（分切、使用、作废等）
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, labelStatus, auditStatus, auditorId, auditorName } = body;

  if (!id) {
    return commonErrors.badRequest('标签ID不能为空');
  }

  // 检查标签是否存在
  const existingLabel = await queryOne<{ id: number; label_status: string }>(
    'SELECT id, label_status FROM inv_inbound_label WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!existingLabel) {
    return commonErrors.notFound('标签不存在');
  }

  const updates: string[] = [];
  const params: any[] = [];

  if (labelStatus) {
    updates.push('label_status = ?');
    params.push(labelStatus);
  }

  if (auditStatus !== undefined) {
    updates.push('audit_status = ?');
    params.push(auditStatus ? 1 : 0);
  }

  if (auditorId) {
    updates.push('auditor_id = ?');
    params.push(auditorId);
  }

  if (auditorName) {
    updates.push('auditor_name = ?');
    params.push(auditorName);
  }

  if (auditStatus) {
    updates.push('audit_time = NOW()');
  }

  if (updates.length === 0) {
    return commonErrors.badRequest('没有要更新的字段');
  }

  params.push(id);

  const result = await execute(
    `UPDATE inv_inbound_label SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  if (result.affectedRows === 0) {
    return commonErrors.notFound('标签不存在');
  }

  return successResponse(null, '标签状态更新成功');
}, '更新标签状态失败');

// DELETE - 删除物料标签（软删除）
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return commonErrors.badRequest('标签ID不能为空');
  }

  const labelId = parseInt(id);

  // 检查标签是否存在
  const existingLabel = await queryOne<{ id: number; label_status: string }>(
    'SELECT id, label_status FROM inv_inbound_label WHERE id = ? AND deleted = 0',
    [labelId]
  );

  if (!existingLabel) {
    return commonErrors.notFound('标签不存在');
  }

  // 检查标签状态，已使用的标签不能删除
  if (existingLabel.label_status === 'used') {
    return errorResponse('已使用的标签不能删除', 409, 409);
  }

  await execute('UPDATE inv_inbound_label SET deleted = 1 WHERE id = ?', [
    labelId,
  ]);

  return successResponse(null, '物料标签删除成功');
}, '删除物料标签失败');
