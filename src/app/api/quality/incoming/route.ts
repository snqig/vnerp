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

// 获取进料检验列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  // 基础查询SQL
  let sql = `
    SELECT
      i.id,
      i.inspection_no as inspectionNo,
      i.inspection_date as inspectionDate,
      i.supplier_name as supplierName,
      i.material_code as materialCode,
      i.material_name as materialName,
      i.specification,
      i.batch_no as batchNo,
      i.quantity,
      i.unit,
      i.inspection_type as inspectionType,
      i.inspection_result as inspectionResult,
      i.inspector_name as inspectorName,
      i.remark,
      i.create_time as createTime
    FROM qc_incoming_inspection i
    WHERE i.deleted = 0
  `;

  let countSql = `SELECT COUNT(*) as total FROM qc_incoming_inspection i WHERE i.deleted = 0`;
  const params: any[] = [];

  if (keyword) {
    const keywordCondition = ` AND (i.inspection_no LIKE ? OR i.supplier_name LIKE ? OR i.material_name LIKE ? OR i.batch_no LIKE ?)`;
    sql += keywordCondition;
    countSql += keywordCondition;
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  if (status) {
    sql += ` AND i.inspection_result = ?`;
    countSql += ` AND i.inspection_result = ?`;
    params.push(status);
  }

  if (startDate) {
    sql += ` AND i.inspection_date >= ?`;
    countSql += ` AND i.inspection_date >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    sql += ` AND i.inspection_date <= ?`;
    countSql += ` AND i.inspection_date <= ?`;
    params.push(endDate);
  }

  sql += ` ORDER BY i.create_time DESC`;

  // 使用分页查询工具
  const result = await queryPaginated(sql, countSql, params, { page, pageSize });

  // 获取每个检验单的明细
  if (result.data.length > 0) {
    const inspectionIds = result.data.map((i: any) => i.id);
    const placeholders = inspectionIds.map(() => '?').join(',');

    const items = await query(
      `SELECT
        id,
        inspection_id as inspectionId,
        item_name as itemName,
        standard,
        actual_value as actualValue,
        result,
        remark as itemRemark
      FROM qc_incoming_inspection_item
      WHERE inspection_id IN (${placeholders}) AND deleted = 0`,
      inspectionIds
    );

    // 将明细分组到对应的检验单
    const itemsMap = new Map();
    for (const item of items as any[]) {
      if (!itemsMap.has(item.inspectionId)) {
        itemsMap.set(item.inspectionId, []);
      }
      itemsMap.get(item.inspectionId).push(item);
    }

    for (const inspection of result.data as any[]) {
      inspection.items = itemsMap.get(inspection.id) || [];
    }
  }

  return paginatedResponse(result.data, result.pagination);
});

// 创建进料检验单
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  // 验证必填字段
  const validation = validateRequestBody(body, [
    'inspectionDate',
    'supplierName',
    'materialCode',
    'materialName',
    'specification',
    'batchNo',
    'quantity',
    'unit',
    'inspectionType',
    'inspectionResult',
    'inspectorName',
  ]);

  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  const {
    inspectionDate,
    supplierName,
    materialCode,
    materialName,
    specification,
    batchNo,
    quantity,
    unit,
    inspectionType,
    inspectionResult,
    inspectorName,
    remark,
    items,
  } = body;

  // 使用事务确保数据一致性
  const result = await transaction(async (connection) => {
    // 生成检验单号
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const [maxInspection] = await connection.query(
      `SELECT MAX(inspection_no) as maxNo FROM qc_incoming_inspection WHERE inspection_no LIKE ?`,
      [`IQC${dateStr}%`]
    );
    const maxNo = (maxInspection as any[])[0]?.maxNo;
    const seq = maxNo
      ? String(parseInt(maxNo.slice(-3)) + 1).padStart(3, '0')
      : '001';
    const inspectionNo = `IQC${dateStr}${seq}`;

    // 插入检验单主表
    const [insertResult] = await connection.execute(
      `INSERT INTO qc_incoming_inspection (
        inspection_no, inspection_date, supplier_name,
        material_code, material_name, specification,
        batch_no, quantity, unit, inspection_type,
        inspection_result, inspector_name, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        inspectionNo,
        inspectionDate,
        supplierName,
        materialCode,
        materialName,
        specification,
        batchNo,
        quantity,
        unit,
        inspectionType,
        inspectionResult,
        inspectorName,
        remark,
      ]
    ) as [any, any];

    const inspectionId = (insertResult as any).insertId;

    // 批量插入检验单明细
    if (items && items.length > 0) {
      const itemValues = items.map((item: any) => [
        inspectionId,
        inspectionNo,
        item.itemName,
        item.standard,
        item.actualValue,
        item.result,
        item.itemRemark,
      ]);

      await connection.query(
        `INSERT INTO qc_incoming_inspection_item (
          inspection_id, inspection_no, item_name,
          standard, actual_value, result, remark
        ) VALUES ?`,
        [itemValues]
      );
    }

    return { id: inspectionId, inspectionNo, inspectionResult };
  });

  if (result.inspectionResult === 'qualified' || result.inspectionResult === '合格') {
    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE inv_inventory_batch SET status = 'normal', freeze_reason = NULL, inspection_id = ? WHERE batch_no = ? AND deleted = 0`,
        [result.id, batchNo]
      );
      await conn.execute(
        `UPDATE inv_inbound_order SET inspection_status = 1, inspection_id = ? WHERE order_no IN (SELECT ref_no FROM qrcode_record WHERE batch_no = ? AND qr_type = 'material' AND deleted = 0) AND deleted = 0`,
        [result.id, batchNo]
      );
    }).catch(() => {});
  } else if (result.inspectionResult === 'unqualified' || result.inspectionResult === '不合格') {
    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE inv_inventory_batch SET status = 'frozen', freeze_reason = '进料检验不合格', inspection_id = ? WHERE batch_no = ? AND deleted = 0`,
        [result.id, batchNo]
      );
      await conn.execute(
        `UPDATE inv_inbound_order SET inspection_status = 2, inspection_id = ? WHERE order_no IN (SELECT ref_no FROM qrcode_record WHERE batch_no = ? AND qr_type = 'material' AND deleted = 0) AND deleted = 0`,
        [result.id, batchNo]
      );
    }).catch(() => {});
  }

  return successResponse(result, '进料检验单创建成功');
}, '创建进料检验单失败');

// 更新进料检验单
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, ...updateData } = body;

  if (!id) {
    return commonErrors.badRequest('检验单ID不能为空');
  }

  // 检查检验单是否存在
  const [inspection] = await query<{ id: number }>(
    'SELECT id FROM qc_incoming_inspection WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!inspection) {
    return commonErrors.notFound('检验单不存在');
  }

  await execute(
    `UPDATE qc_incoming_inspection SET
      inspection_date = ?,
      supplier_name = ?,
      material_code = ?,
      material_name = ?,
      specification = ?,
      batch_no = ?,
      quantity = ?,
      unit = ?,
      inspection_type = ?,
      inspection_result = ?,
      inspector_name = ?,
      remark = ?
    WHERE id = ?`,
    [
      updateData.inspectionDate,
      updateData.supplierName,
      updateData.materialCode,
      updateData.materialName,
      updateData.specification,
      updateData.batchNo,
      updateData.quantity,
      updateData.unit,
      updateData.inspectionType,
      updateData.inspectionResult,
      updateData.inspectorName,
      updateData.remark,
      id,
    ]
  );

  if (updateData.inspectionResult === 'qualified' || updateData.inspectionResult === '合格') {
    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE inv_inventory_batch SET status = 'normal', freeze_reason = NULL, inspection_id = ? WHERE batch_no = ? AND deleted = 0`,
        [id, updateData.batchNo]
      );
      await conn.execute(
        `UPDATE inv_inbound_order SET inspection_status = 1, inspection_id = ? WHERE order_no IN (SELECT ref_no FROM qrcode_record WHERE batch_no = ? AND qr_type = 'material' AND deleted = 0) AND deleted = 0`,
        [id, updateData.batchNo]
      );
    }).catch(() => {});
  } else if (updateData.inspectionResult === 'unqualified' || updateData.inspectionResult === '不合格') {
    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE inv_inventory_batch SET status = 'frozen', freeze_reason = '进料检验不合格', inspection_id = ? WHERE batch_no = ? AND deleted = 0`,
        [id, updateData.batchNo]
      );
      await conn.execute(
        `UPDATE inv_inbound_order SET inspection_status = 2, inspection_id = ? WHERE order_no IN (SELECT ref_no FROM qrcode_record WHERE batch_no = ? AND qr_type = 'material' AND deleted = 0) AND deleted = 0`,
        [id, updateData.batchNo]
      );
    }).catch(() => {});
  }

  // 更新检验单明细
  if (updateData.items && updateData.items.length > 0) {
    // 先删除原有的明细
    await execute(
      'UPDATE qc_incoming_inspection_item SET deleted = 1 WHERE inspection_id = ?',
      [id]
    );

    // 插入新的明细
    const itemValues = updateData.items.map((item: any) => [
      id,
      updateData.inspectionNo,
      item.itemName,
      item.standard,
      item.actualValue,
      item.result,
      item.itemRemark,
    ]);

    await execute(
      `INSERT INTO qc_incoming_inspection_item (
        inspection_id, inspection_no, item_name,
        standard, actual_value, result, remark
      ) VALUES ?`,
      [itemValues]
    );
  }

  return successResponse(null, '进料检验单更新成功');
}, '更新进料检验单失败');

// 删除进料检验单（软删除）
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return commonErrors.badRequest('检验单ID不能为空');
  }

  // 检查检验单是否存在
  const [inspection] = await query<{ id: number }>(
    'SELECT id FROM qc_incoming_inspection WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!inspection) {
    return commonErrors.notFound('检验单不存在');
  }

  // 使用事务同时更新主表和明细表
  await transaction(async (connection) => {
    await connection.execute(
      'UPDATE qc_incoming_inspection SET deleted = 1 WHERE id = ?',
      [id]
    );
    await connection.execute(
      'UPDATE qc_incoming_inspection_item SET deleted = 1 WHERE inspection_id = ?',
      [id]
    );
  });

  return successResponse(null, '进料检验单删除成功');
}, '删除进料检验单失败');
