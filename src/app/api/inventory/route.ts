import { NextRequest } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody,
} from '@/lib/api-response';

function calculateAlertLevel(availableQty: number, safetyStock?: number): string {
  if (availableQty <= 0) return 'critical';
  if (safetyStock && availableQty < safetyStock) return 'warning';
  if (availableQty < 10) return 'warning';
  return 'normal';
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const warehouseId = searchParams.get('warehouseId');
  const status = searchParams.get('status');
  const keyword = searchParams.get('keyword');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  let sql = `
    SELECT
      ib.id,
      ib.batch_no,
      ib.material_id,
      ib.material_name,
      m.specification as material_spec,
      m.material_code,
      ib.warehouse_id,
      ib.warehouse_name,
      ib.quantity,
      ib.available_qty,
      ib.locked_qty,
      ib.unit,
      ib.unit_price,
      ib.status,
      ib.produce_date,
      ib.expire_date,
      ib.inbound_date,
      ib.create_time,
      m.safety_stock
    FROM inv_inventory_batch ib
    LEFT JOIN inv_material m ON ib.material_id = m.id
    WHERE ib.deleted = 0
  `;
  const values: any[] = [];

  if (warehouseId && warehouseId !== 'all') {
    sql += ' AND ib.warehouse_id = ?';
    values.push(parseInt(warehouseId));
  }

  if (status && status !== 'all') {
    sql += ' AND ib.status = ?';
    values.push(status);
  }

  if (keyword) {
    sql += ' AND (ib.batch_no LIKE ? OR ib.material_name LIKE ? OR m.material_code LIKE ?)';
    const likeKeyword = `%${keyword}%`;
    values.push(likeKeyword, likeKeyword, likeKeyword);
  }

  let countSql = `SELECT COUNT(*) as total FROM inv_inventory_batch ib LEFT JOIN inv_material m ON ib.material_id = m.id WHERE ib.deleted = 0`;
  const countValues: any[] = [];

  if (warehouseId && warehouseId !== 'all') {
    countSql += ' AND ib.warehouse_id = ?';
    countValues.push(parseInt(warehouseId));
  }

  if (status && status !== 'all') {
    countSql += ' AND ib.status = ?';
    countValues.push(status);
  }

  if (keyword) {
    countSql += ' AND (ib.batch_no LIKE ? OR ib.material_name LIKE ? OR m.material_code LIKE ?)';
    const likeKeyword = `%${keyword}%`;
    countValues.push(likeKeyword, likeKeyword, likeKeyword);
  }

  const countResult = await query(countSql, countValues);
  const total = (countResult as any[])[0]?.total || 0;

  sql += ' ORDER BY ib.create_time DESC';
  sql += ' LIMIT ? OFFSET ?';
  values.push(pageSize, (page - 1) * pageSize);

  const data = await query(sql, values);

  const processedData = (data as any[]).map((item) => ({
    ...item,
    alertLevel: calculateAlertLevel(parseFloat(item.available_qty) || 0, item.safety_stock ? parseFloat(item.safety_stock) : undefined),
  }));

  return successResponse({
    list: processedData,
    total,
    page,
    pageSize,
  });
}, '获取库存列表失败');

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { action, batchNo, quantity, warehouseId, materialId, sourceType, sourceNo } = body;

  const validation = validateRequestBody(body, ['action', 'quantity']);
  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  if (action === 'inbound') {
    const inboundValidation = validateRequestBody(body, ['warehouseId', 'materialId']);
    if (!inboundValidation.valid) {
      return errorResponse(`入库操作缺少必填字段: ${inboundValidation.missing.join(', ')}`, 400, 400);
    }

    const material = await queryOne<any>(
      'SELECT id, material_name, material_code, unit, purchase_price FROM inv_material WHERE id = ? AND deleted = 0',
      [materialId]
    );
    if (!material) {
      return commonErrors.notFound('物料不存在');
    }

    const warehouse = await queryOne<any>(
      'SELECT id, warehouse_name FROM inv_warehouse WHERE id = ? AND deleted = 0',
      [warehouseId]
    );
    if (!warehouse) {
      return commonErrors.notFound('仓库不存在');
    }

    const batchNoNew = `B${Date.now()}`;
    const transNo = `IN${Date.now()}`;

    await execute(
      `INSERT INTO inv_inventory_batch (batch_no, material_id, material_name, warehouse_id, warehouse_name, quantity, available_qty, locked_qty, unit, unit_price, inbound_date, status, create_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, CURDATE(), 'normal', NOW())`,
      [batchNoNew, materialId, material.material_name, warehouseId, warehouse.warehouse_name, quantity, quantity, material.unit || '个', material.purchase_price || 0]
    );

    const [batchRows]: any = await execute('SELECT LAST_INSERT_ID() as id');
    const batchId = batchRows[0].id;

    await execute(
      `INSERT INTO inv_inventory_transaction (trans_no, trans_type, source_type, material_id, material_code, batch_no, warehouse_id, quantity, unit_cost, total_cost, remark, create_time)
       VALUES (?, 'in', ?, ?, ?, ?, ?, ?, ?, ?, '入库操作', NOW())`,
      [transNo, sourceType || 'manual', materialId, material.material_code, batchNoNew, warehouseId, quantity, material.purchase_price || 0, quantity * (material.purchase_price || 0)]
    );

    await execute(
      `INSERT INTO inv_inventory_log (warehouse_id, material_id, batch_no, trans_type, quantity, before_qty, after_qty, unit, source_type, source_no, create_time)
       VALUES (?, ?, ?, 'in', ?, 0, ?, ?, ?, ?, NOW())`,
      [warehouseId, materialId, batchNoNew, quantity, quantity, material.unit || '个', sourceType || 'manual', sourceNo || transNo]
    );

    return successResponse({
      transNo,
      batchNo: batchNoNew,
      batchId,
      quantity,
      warehouseId,
      materialId,
    }, '入库成功');
  } else if (action === 'outbound') {
    const outboundValidation = validateRequestBody(body, ['batchNo']);
    if (!outboundValidation.valid) {
      return errorResponse(`出库操作缺少必填字段: ${outboundValidation.missing.join(', ')}`, 400, 400);
    }

    const batch = await queryOne<any>(
      'SELECT id, batch_no, material_id, material_name, warehouse_id, available_qty, quantity, unit, unit_price, version FROM inv_inventory_batch WHERE batch_no = ? AND deleted = 0',
      [batchNo]
    );

    if (!batch) {
      return commonErrors.notFound('库存批次不存在');
    }

    if (parseFloat(batch.available_qty) < quantity) {
      return errorResponse('可用库存不足', 409, 409);
    }

    const transNo = `OUT${Date.now()}`;
    const newAvailableQty = parseFloat(batch.available_qty) - quantity;
    const newQuantity = parseFloat(batch.quantity) - quantity;

    const updateResult = await execute(
      "UPDATE inv_inventory_batch SET available_qty = ?, quantity = ?, version = version + 1, update_time = NOW() WHERE id = ? AND version = ?",
      [newAvailableQty, newQuantity, batch.id, batch.version]
    );

    if ((updateResult as any).affectedRows === 0) {
      return errorResponse('库存已被修改，请重试', 409, 409);
    }

    await execute(
      `INSERT INTO inv_inventory_transaction (trans_no, trans_type, source_type, material_id, batch_no, warehouse_id, quantity, unit_cost, total_cost, remark, create_time)
       VALUES (?, 'out', ?, ?, ?, ?, ?, ?, ?, '出库操作', NOW())`,
      [transNo, sourceType || 'manual', batch.material_id, batchNo, batch.warehouse_id, quantity, batch.unit_price, quantity * parseFloat(batch.unit_price || 0)]
    );

    await execute(
      `INSERT INTO inv_inventory_log (warehouse_id, material_id, batch_no, trans_type, quantity, before_qty, after_qty, unit, source_type, source_no, create_time)
       VALUES (?, ?, ?, 'out', ?, ?, ?, ?, ?, ?, NOW())`,
      [batch.warehouse_id, batch.material_id, batchNo, quantity, batch.available_qty, newAvailableQty, batch.unit, sourceType || 'manual', sourceNo || transNo]
    );

    return successResponse({
      transNo,
      batchNo,
      quantity,
      operatedAt: new Date().toISOString(),
    }, '出库成功');
  } else if (action === 'transfer') {
    const transferValidation = validateRequestBody(body, ['batchNo', 'warehouseId']);
    if (!transferValidation.valid) {
      return errorResponse(`调拨操作缺少必填字段: ${transferValidation.missing.join(', ')}`, 400, 400);
    }

    const batch = await queryOne<any>(
      'SELECT id, batch_no, material_id, material_name, warehouse_id, warehouse_name, available_qty, quantity, unit, unit_price, version FROM inv_inventory_batch WHERE batch_no = ? AND deleted = 0',
      [batchNo]
    );

    if (!batch) {
      return commonErrors.notFound('库存批次不存在');
    }

    const targetWarehouse = await queryOne<any>(
      'SELECT id, warehouse_name FROM inv_warehouse WHERE id = ? AND deleted = 0',
      [warehouseId]
    );

    if (!targetWarehouse) {
      return commonErrors.notFound('目标仓库不存在');
    }

    const transNo = `TRF${Date.now()}`;
    const fromWarehouseId = batch.warehouse_id;
    const fromWarehouseName = batch.warehouse_name;

    const updateResult = await execute(
      "UPDATE inv_inventory_batch SET warehouse_id = ?, warehouse_name = ?, version = version + 1, update_time = NOW() WHERE id = ? AND version = ?",
      [warehouseId, targetWarehouse.warehouse_name, batch.id, batch.version]
    );

    if ((updateResult as any).affectedRows === 0) {
      return errorResponse('库存已被修改，请重试', 409, 409);
    }

    await execute(
      `INSERT INTO inv_inventory_transaction (trans_no, trans_type, source_type, material_id, batch_no, warehouse_id, quantity, unit_cost, total_cost, remark, create_time)
       VALUES (?, 'transfer', ?, ?, ?, ?, ?, ?, ?, '调拨操作', NOW())`,
      [transNo, sourceType || 'manual', batch.material_id, batchNo, warehouseId, batch.quantity, batch.unit_price, parseFloat(batch.quantity) * parseFloat(batch.unit_price || 0)]
    );

    await execute(
      `INSERT INTO inv_inventory_log (warehouse_id, material_id, batch_no, trans_type, quantity, before_qty, after_qty, unit, source_type, source_no, create_time)
       VALUES (?, ?, ?, 'transfer', ?, ?, ?, ?, ?, ?, NOW())`,
      [fromWarehouseId, batch.material_id, batchNo, batch.quantity, batch.available_qty, batch.available_qty, batch.unit, sourceType || 'manual', sourceNo || transNo]
    );

    return successResponse({
      transNo,
      batchNo,
      quantity,
      fromWarehouseId,
      fromWarehouseName,
      toWarehouseId: warehouseId,
      toWarehouseName: targetWarehouse.warehouse_name,
    }, '调拨成功');
  }

  return commonErrors.badRequest('未知操作类型');
}, '库存操作失败');
