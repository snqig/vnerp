import { NextRequest } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  withErrorHandler,
} from '@/lib/api-response';
import { WarehouseStateMachine, InboundStatus } from '@/lib/warehouse-state-machine';

// 审核入库单 - 确认入库并更新库存
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, auditorId, auditorName, remark } = body;

  if (!id) {
    return errorResponse('入库单ID不能为空', 400);
  }

  // 检查入库单状态
  const [order] = await query<{
    id: number;
    order_no: string;
    status: InboundStatus;
    warehouse_id: number;
    warehouse_code: string;
    warehouse_name: string;
  }>(
    `SELECT id, order_no, status, warehouse_id, warehouse_code, warehouse_name
     FROM inv_inbound_order WHERE id = ? AND deleted = 0`,
    [id]
  );

  if (!order) {
    return errorResponse('入库单不存在', 404);
  }

  // 使用状态机验证状态流转
  if (!WarehouseStateMachine.canAuditInbound(order.status)) {
    return errorResponse(
      `当前状态【${WarehouseStateMachine.getInboundStatusLabel(order.status)}】不允许审核`,
      400
    );
  }

  // 获取入库单明细
  const items = await query<{
    id: number;
    material_id: number;
    material_code: string;
    material_name: string;
    specification: string;
    batch_no: string;
    qty: number;
    unit: string;
    location_code: string;
    is_raw_material: number;
  }>(
    `SELECT id, material_id, material_code, material_name, specification, 
            batch_no, qty, unit, location_code, is_raw_material
     FROM inv_inbound_item WHERE order_id = ? AND deleted = 0`,
    [id]
  );

  if (items.length === 0) {
    return errorResponse('入库单没有明细，不能审核', 400);
  }

  // 使用事务确保数据一致性
  await transaction(async (connection) => {
    // 1. 更新入库单状态为已完成
    await connection.execute(
      `UPDATE inv_inbound_order SET
        status = 'completed',
        audit_status = 1,
        auditor_id = ?,
        auditor_name = ?,
        audit_time = NOW(),
        audit_remark = ?,
        update_time = NOW()
      WHERE id = ?`,
      [auditorId, auditorName, remark || '', id]
    );

    // 2. 更新库存 - 为每个明细创建或更新库存批次
    for (const item of items) {
      const [existingBatch] = await connection.query(
        `SELECT id, quantity, available_qty 
         FROM inv_inventory_batch 
         WHERE batch_no = ? AND material_id = ? AND warehouse_id = ? AND deleted = 0`,
        [item.batch_no, item.material_id, order.warehouse_id]
      );

      if ((existingBatch as any[]).length > 0) {
        const batch = (existingBatch as any[])[0];
        await connection.execute(
          `UPDATE inv_inventory_batch SET
            quantity = quantity + ?,
            available_qty = available_qty + ?,
            update_time = NOW()
          WHERE id = ?`,
          [item.qty, item.qty, batch.id]
        );
      } else {
        await connection.execute(
          `INSERT INTO inv_inventory_batch (
            batch_no, material_id, material_code, material_name, specification,
            warehouse_id, warehouse_code, warehouse_name, location_code,
            quantity, available_qty, unit, unit_price, status, is_raw_material, inbound_date, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'normal', ?, CURDATE(), NOW())`,
          [
            item.batch_no,
            item.material_id,
            item.material_code,
            item.material_name,
            item.specification,
            order.warehouse_id,
            order.warehouse_code,
            order.warehouse_name,
            item.location_code,
            item.qty,
            item.qty,
            item.unit,
            item.is_raw_material,
          ]
        );
      }

      // 3. 更新总库存表（累加）
      const [existingInv] = await connection.query(
        `SELECT id FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0`,
        [item.material_id, order.warehouse_id]
      );

      if ((existingInv as any[]).length > 0) {
        await connection.execute(
          `UPDATE inv_inventory SET
            quantity = quantity + ?,
            available_qty = available_qty + ?,
            update_time = NOW()
          WHERE material_id = ? AND warehouse_id = ?`,
          [item.qty, item.qty, item.material_id, order.warehouse_id]
        );
      } else {
        await connection.execute(
          `INSERT INTO inv_inventory (
            material_id, material_name, warehouse_id, warehouse_name,
            quantity, available_qty, locked_qty, unit, unit_cost, total_cost,
            safety_stock, version, create_time, update_time, deleted
          ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0, 0, 0, 1, NOW(), NOW(), 0)`,
          [
            item.material_id,
            item.material_name,
            order.warehouse_id,
            order.warehouse_name,
            item.qty,
            item.qty,
            item.unit,
          ]
        );
      }

      // 3. 创建库存交易记录
      await connection.execute(
        `INSERT INTO inv_inventory_transaction (
          trans_no, trans_type, batch_no, material_id, material_code, material_name,
          warehouse_id, warehouse_code, quantity, source_type, source_no,
          operated_by, operated_at, remark
        ) VALUES (
          ?, 'inbound', ?, ?, ?, ?, ?, ?, ?, 'inbound_order', ?, ?, NOW(), ?
        )`,
        [
          `IN${Date.now()}${item.id}`,
          item.batch_no,
          item.material_id,
          item.material_code,
          item.material_name,
          order.warehouse_id,
          order.warehouse_code,
          item.qty,
          order.order_no,
          auditorId,
          remark || '',
        ]
      );
    }
  });

  return successResponse(
    { orderId: id, orderNo: order.order_no, status: 'completed' },
    '入库单审核成功，库存已更新'
  );
}, '审核入库单失败');

// 撤销审核 - 将已完成的入库单退回
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, auditorId, auditorName, remark } = body;

  if (!id) {
    return errorResponse('入库单ID不能为空', 400);
  }

  // 检查入库单状态
  const [order] = await query<{
    id: number;
    order_no: string;
    status: InboundStatus;
    warehouse_id: number;
  }>(
    `SELECT id, order_no, status, warehouse_id FROM inv_inbound_order WHERE id = ? AND deleted = 0`,
    [id]
  );

  if (!order) {
    return errorResponse('入库单不存在', 404);
  }

  // 使用状态机验证状态流转
  if (!WarehouseStateMachine.canTransitionInbound(order.status, 'pending')) {
    return errorResponse(
      WarehouseStateMachine.getTransitionError('inbound', order.status, 'pending'),
      400
    );
  }

  // 获取入库单明细
  const items = await query<{
    material_id: number;
    batch_no: string;
    qty: number;
  }>(
    `SELECT material_id, batch_no, qty FROM inv_inbound_item WHERE order_id = ? AND deleted = 0`,
    [id]
  );

  // 使用事务确保数据一致性
  await transaction(async (connection) => {
    // 1. 检查库存是否足够扣减
    for (const item of items) {
      const [batch] = await connection.query(
        `SELECT id, available_qty FROM inv_inventory_batch 
         WHERE batch_no = ? AND material_id = ? AND warehouse_id = ? AND deleted = 0`,
        [item.batch_no, item.material_id, order.warehouse_id]
      );

      if ((batch as any[]).length === 0) {
        throw new Error(`库存批次不存在: ${item.batch_no}`);
      }

      const batchData = (batch as any[])[0];
      if (batchData.available_qty < item.qty) {
        throw new Error(`库存不足，无法撤销: ${item.batch_no}`);
      }
    }

    // 2. 扣减库存
    for (const item of items) {
      await connection.execute(
        `UPDATE inv_inventory_batch SET
          quantity = quantity - ?,
          available_qty = available_qty - ?,
          update_time = NOW()
        WHERE batch_no = ? AND material_id = ? AND warehouse_id = ?`,
        [item.qty, item.qty, item.batch_no, item.material_id, order.warehouse_id]
      );

      await connection.execute(
        `UPDATE inv_inventory SET
          quantity = quantity - ?,
          available_qty = available_qty - ?,
          update_time = NOW()
        WHERE material_id = ? AND warehouse_id = ?`,
        [item.qty, item.qty, item.material_id, order.warehouse_id]
      );

      // 3. 创建负向交易记录
      await connection.execute(
        `INSERT INTO inv_inventory_transaction (
          trans_no, trans_type, batch_no, material_id,
          warehouse_id, quantity, source_type, source_no,
          operated_by, operated_at, remark
        ) VALUES (?, 'inbound_cancel', ?, ?, ?, ?, 'inbound_order', ?, ?, NOW(), ?)`,
        [
          `INC${Date.now()}${item.material_id}`,
          item.batch_no,
          item.material_id,
          order.warehouse_id,
          -item.qty,
          order.order_no,
          auditorId,
          `撤销审核: ${remark || ''}`,
        ]
      );
    }

    // 4. 更新入库单状态为待审核
    await connection.execute(
      `UPDATE inv_inbound_order SET
        status = 'pending',
        audit_status = 0,
        auditor_id = NULL,
        auditor_name = NULL,
        audit_time = NULL,
        audit_remark = ?,
        update_time = NOW()
      WHERE id = ?`,
      [`撤销审核: ${remark || ''} 操作人: ${auditorName || ''}`, id]
    );
  });

  return successResponse(
    { orderId: id, orderNo: order.order_no, status: 'pending' },
    '入库单撤销审核成功，库存已扣减'
  );
}, '撤销审核失败');
