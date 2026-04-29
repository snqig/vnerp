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
import { generateDocumentNo } from '@/lib/document-numbering';
import { WarehouseStateMachine, OutboundStatus } from '@/lib/warehouse-state-machine';

// 获取出库单列表
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
      o.id,
      o.order_no as orderNo,
      o.order_date as orderDate,
      o.outbound_type as outboundType,
      o.warehouse_code as warehouseCode,
      o.warehouse_name as warehouseName,
      o.total_qty as totalQty,
      o.total_amount as totalAmount,
      o.currency,
      o.status,
      o.remark,
      o.operator_name as operatorName,
      o.audit_status as auditStatus,
      o.auditor_name as auditorName,
      o.audit_time as auditTime,
      o.create_time as createTime
    FROM inv_outbound_order o
    WHERE o.deleted = 0
  `;

  let countSql = `SELECT COUNT(*) as total FROM inv_outbound_order o WHERE o.deleted = 0`;
  const params: any[] = [];

  if (keyword) {
    const keywordCondition = ` AND (o.order_no LIKE ? OR o.remark LIKE ?)`;
    sql += keywordCondition;
    countSql += keywordCondition;
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (status) {
    sql += ` AND o.status = ?`;
    countSql += ` AND o.status = ?`;
    params.push(status);
  }

  if (startDate) {
    sql += ` AND o.order_date >= ?`;
    countSql += ` AND o.order_date >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    sql += ` AND o.order_date <= ?`;
    countSql += ` AND o.order_date <= ?`;
    params.push(endDate);
  }

  sql += ` ORDER BY o.create_time DESC`;

  // 使用分页查询工具
  const result = await queryPaginated(sql, countSql, params, { page, pageSize });

  // 获取每个订单的明细（使用IN查询优化N+1问题）
  if (result.data.length > 0) {
    const orderIds = result.data.map((o: any) => o.id);
    const placeholders = orderIds.map(() => '?').join(',');

    const items = await query(
      `SELECT
        id,
        order_id as orderId,
        material_id,
        material_name as materialName,
        material_spec as specification,
        quantity as qty,
        unit,
        unit_price,
        amount,
        batch_no as batchNo,
        remark
      FROM inv_outbound_item
      WHERE order_id IN (${placeholders})`,
      orderIds
    );

    // 将明细分组到对应的订单
    const itemsMap = new Map();
    for (const item of items as any[]) {
      if (!itemsMap.has(item.orderId)) {
        itemsMap.set(item.orderId, []);
      }
      itemsMap.get(item.orderId).push(item);
    }

    for (const order of result.data as any[]) {
      order.items = itemsMap.get(order.id) || [];
    }
  }

  return paginatedResponse(result.data, result.pagination);
});

// 创建出库单
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  // 验证必填字段
  const validation = validateRequestBody(body, [
    'orderDate',
    'warehouseId',
    'warehouseCode',
    'warehouseName',
    'items',
    'operatorId',
    'operatorName',
  ]);

  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  const {
    orderDate,
    outboundType,
    warehouseId,
    warehouseCode,
    warehouseName,
    remark,
    items,
    operatorId,
    operatorName,
  } = body;

  const orderNo = await generateDocumentNo('outbound');

  // 使用事务确保数据一致性
  const result = await transaction(async (connection) => {

    // 计算总金额
    const totalQty = items.reduce(
      (sum: number, item: any) => sum + (parseFloat(item.qty) || 0),
      0
    );
    const totalAmount = items.reduce(
      (sum: number, item: any) =>
        sum + (parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0),
      0
    );

    // 插入出库单主表
    const [orderResult] = await connection.execute(
      `INSERT INTO inv_outbound_order (
        order_no, order_date, outbound_type,
        warehouse_id, warehouse_code, warehouse_name,
        total_qty, total_amount, remark, operator_id, operator_name, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        orderNo,
        orderDate,
        outboundType,
        warehouseId,
        warehouseCode,
        warehouseName,
        totalQty,
        totalAmount,
        remark,
        operatorId,
        operatorName,
      ]
    );

    const orderId = (orderResult as any).insertId;

    // 批量插入出库单明细
    if (items.length > 0) {
      const itemValues = items.map((item: any) => [
        orderId,
        item.materialId,
        item.materialName,
        item.specification || '',
        item.qty,
        item.unit || '个',
        item.unitPrice || 0,
        (parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0),
        item.batchNo || '',
        item.remark || '',
      ]);

      await connection.query(
        `INSERT INTO inv_outbound_item (
          order_id, material_id, material_name,
          material_spec, quantity, unit, unit_price, amount,
          batch_no, remark
        ) VALUES ?`,
        [itemValues]
      );
    }

    return { id: orderId, orderNo };
  });

  return successResponse(result, '出库单创建成功');
}, '创建出库单失败');

// 更新出库单
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, ...updateData } = body;

  if (!id) {
    return commonErrors.badRequest('出库单ID不能为空');
  }

  // 检查出库单状态
  const [order] = await query<{ status: OutboundStatus }>(
    'SELECT status FROM inv_outbound_order WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!order) {
    return commonErrors.notFound('出库单不存在');
  }

  // 使用状态机检查是否允许编辑
  if (!WarehouseStateMachine.canEditOutbound(order.status)) {
    return errorResponse(
      `当前状态【${WarehouseStateMachine.getOutboundStatusLabel(order.status)}】不允许修改`,
      400,
      400
    );
  }

  await execute(
    `UPDATE inv_outbound_order SET
      order_date = ?,
      outbound_type = ?,
      warehouse_id = ?,
      warehouse_code = ?,
      warehouse_name = ?,
      remark = ?,
      update_time = NOW()
    WHERE id = ?`,
    [
      updateData.orderDate,
      updateData.outboundType,
      updateData.warehouseId,
      updateData.warehouseCode,
      updateData.warehouseName,
      updateData.remark,
      id,
    ]
  );

  return successResponse(null, '出库单更新成功');
}, '更新出库单失败');

// 删除出库单（软删除）
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return commonErrors.badRequest('出库单ID不能为空');
  }

  // 检查出库单状态
  const [order] = await query<{ status: OutboundStatus }>(
    'SELECT status FROM inv_outbound_order WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!order) {
    return commonErrors.notFound('出库单不存在');
  }

  // 使用状态机检查是否允许删除
  if (!WarehouseStateMachine.canDeleteOutbound(order.status)) {
    return errorResponse(
      `当前状态【${WarehouseStateMachine.getOutboundStatusLabel(order.status)}】不允许删除`,
      400,
      400
    );
  }

  // 使用事务同时更新主表和明细表
  await transaction(async (connection) => {
    await connection.execute(
      'UPDATE inv_outbound_order SET deleted = 1, update_time = NOW() WHERE id = ?',
      [id]
    );
    await connection.execute(
      'UPDATE inv_outbound_item SET deleted = 1 WHERE order_id = ?',
      [id]
    );
  });

  return successResponse(null, '出库单删除成功');
}, '删除出库单失败');
