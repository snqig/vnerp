import { query, execute } from '@/lib/db';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';
import type { NextRequest } from 'next/server';

function generateLabelNo(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `LBL-${year}${month}${day}-${random}`;
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const labelNo = searchParams.get('labelNo');
  const materialCode = searchParams.get('materialCode');
  const batchNo = searchParams.get('batchNo');
  const isCut = searchParams.get('isCut');

  if (id) {
    const rows = await query(`
      SELECT ml.*, w.warehouse_name, l.location_name
      FROM inv_material_label ml
      LEFT JOIN inv_warehouse w ON ml.warehouse_id = w.id
      LEFT JOIN inv_location l ON ml.location_id = l.id
      WHERE ml.id = ? AND ml.deleted = 0
    `, [id]);
    return successResponse((rows as any[])[0], '标签详情');
  }

  if (labelNo) {
    const rows = await query(`
      SELECT ml.*, w.warehouse_name, l.location_name
      FROM inv_material_label ml
      LEFT JOIN inv_warehouse w ON ml.warehouse_id = w.id
      LEFT JOIN inv_location l ON ml.location_id = l.id
      WHERE ml.label_no = ? AND ml.deleted = 0
    `, [labelNo]);
    return successResponse((rows as any[])[0], '标签详情');
  }

  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const offset = (page - 1) * pageSize;

  let whereClause = 'ml.deleted = 0';
  const params: any[] = [];

  if (materialCode) {
    whereClause += ' AND ml.material_code = ?';
    params.push(materialCode);
  }
  if (batchNo) {
    whereClause += ' AND ml.batch_no = ?';
    params.push(batchNo);
  }
  if (isCut !== undefined) {
    whereClause += ' AND ml.is_cut = ?';
    params.push(isCut === 'true' ? 1 : 0);
  }

  const warehouseId = searchParams.get('warehouseId');
  if (warehouseId) {
    whereClause += ' AND ml.warehouse_id = ?';
    params.push(warehouseId);
  }

  const [rows, countResult] = await Promise.all([
    query(`
      SELECT ml.*, w.warehouse_name, l.location_name
      FROM inv_material_label ml
      LEFT JOIN inv_warehouse w ON ml.warehouse_id = w.id
      LEFT JOIN inv_location l ON ml.location_id = l.id
      WHERE ${whereClause}
      ORDER BY ml.create_time DESC
      LIMIT ? OFFSET ?
    `, [...params, pageSize, offset]),
    query(`SELECT COUNT(*) as total FROM inv_material_label ml WHERE ${whereClause}`, params)
  ]);

  return successResponse({
    list: rows,
    total: (countResult as any[])[0].total,
    page,
    pageSize
  }, '标签列表');
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { type } = body;

  if (type === 'cut') {
    return handleCut(body);
  }

  const {
    materialCode,
    materialName,
    specification,
    unit,
    batchNo,
    quantity,
    packageQty,
    width,
    lengthPerRoll,
    colorCode,
    mixRemark,
    warehouseId,
    locationId,
    isMainMaterial,
    remark,
    purchaseOrderNo,
    supplierName,
    receiveDate
  } = body;

  if (!materialCode || !materialName || !quantity) {
    return errorResponse('缺少必要参数：materialCode, materialName, quantity', 400);
  }

  const labelNo = generateLabelNo();

  const result = await execute(`
    INSERT INTO inv_material_label (
      label_no, material_code, material_name, specification, unit,
      batch_no, quantity, package_qty, width, length_per_roll,
      color_code, mix_remark, warehouse_id, location_id,
      is_main_material, is_used, is_cut, parent_label_id,
      label_type, remaining_width, remaining_length, status,
      remark, purchase_order_no, supplier_name, receive_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NULL, 1, ?, ?, 1, ?, ?, ?, ?)
  `, [
    labelNo, materialCode, materialName, specification ?? null, unit ?? null,
    batchNo ?? null, quantity, packageQty ?? null, width ?? null, lengthPerRoll ?? null,
    colorCode ?? null, mixRemark ?? null, warehouseId ?? null, locationId ?? null,
    isMainMaterial ? 1 : 0, width ?? null, lengthPerRoll ?? null, remark ?? null,
    purchaseOrderNo ?? null, supplierName ?? null, receiveDate ?? null
  ]);

  return successResponse({ id: (result as any).insertId, labelNo }, '标签创建成功');
});

async function handleCut(body: any) {
  const { parentLabelId, cutWidths, operatorName } = body;

  if (!parentLabelId || !cutWidths || !Array.isArray(cutWidths) || cutWidths.length === 0) {
    return errorResponse('缺少必要参数', 400);
  }

  const parentLabel = await query(`
    SELECT * FROM inv_material_label WHERE id = ? AND deleted = 0
  `, [parentLabelId]);

  const parent = (parentLabel as any[])[0];

  if (!parent) {
    return errorResponse('父标签不存在', 404);
  }

  if (parent.is_cut === 1) {
    return errorResponse('该标签已被分切', 400);
  }

  const totalCutWidth = cutWidths.reduce((sum: number, w: number) => sum + w, 0);

  if (totalCutWidth > parent.width) {
    return errorResponse(`分切总宽度 ${totalCutWidth} 超过原宽度 ${parent.width}`, 400);
  }

  const newLabels: any[] = [];

  for (const cutWidth of cutWidths) {
    const newLabelNo = generateLabelNo();
    const ratio = cutWidth / parent.width;
    const newQuantity = Math.floor(parent.quantity * ratio);

    const result = await execute(`
      INSERT INTO inv_material_label (
        label_no, material_code, material_name, specification, unit,
        batch_no, quantity, package_qty, width, length_per_roll,
        color_code, mix_remark, warehouse_id, location_id,
        is_main_material, is_used, is_cut, parent_label_id,
        label_type, remaining_width, remaining_length, status,
        remark, purchase_order_no, supplier_name, receive_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 2, ?, ?, 1, ?, ?, ?, ?)
    `, [
      newLabelNo, parent.material_code, parent.material_name, parent.specification, parent.unit,
      parent.batch_no, newQuantity, parent.package_qty ? parent.package_qty * ratio : null, cutWidth, parent.length_per_roll ?? null,
      parent.color_code ?? null, parent.mix_remark ?? null, parent.warehouse_id ?? null, parent.location_id ?? null,
      parent.is_main_material, parentLabelId, cutWidth, parent.length_per_roll ?? null,
      `分切自 ${parent.label_no}`, parent.purchase_order_no ?? null, parent.supplier_name ?? null, parent.receive_date ?? null
    ]);

    newLabels.push({
      id: (result as any).insertId,
      labelNo: newLabelNo,
      width: cutWidth,
      quantity: newQuantity
    });
  }

  await execute(`
    UPDATE inv_material_label
    SET is_cut = 1, remaining_width = width - ?, remaining_length = 0, update_time = NOW()
    WHERE id = ?
  `, [totalCutWidth, parentLabelId]);

  return successResponse({
    parentLabelId,
    newLabels,
    remainingWidth: parent.width - totalCutWidth
  }, '分切成功');
}

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id } = body;

  if (!id) {
    return errorResponse('缺少标签ID', 400);
  }

  const updateFields: string[] = [];
  const params: any[] = [];

  const fieldMap: Record<string, string> = {
    warehouseId: 'warehouse_id',
    locationId: 'location_id',
    isUsed: 'is_used',
    remark: 'remark',
    status: 'status'
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (body[key] !== undefined) {
      updateFields.push(`${col} = ?`);
      params.push(body[key]);
    }
  }

  if (updateFields.length === 0) {
    return errorResponse('没有需要更新的字段', 400);
  }

  updateFields.push('update_time = NOW()');
  params.push(id);

  await execute(`UPDATE inv_material_label SET ${updateFields.join(', ')} WHERE id = ?`, params);

  return successResponse(null, '标签更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return errorResponse('缺少标签ID', 400);
  }

  await execute('UPDATE inv_material_label SET deleted = 1, update_time = NOW() WHERE id = ?', [id]);

  return successResponse(null, '标签删除成功');
});
