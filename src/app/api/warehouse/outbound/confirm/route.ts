import { NextRequest } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  withErrorHandler,
} from '@/lib/api-response';
import { WarehouseStateMachine, OutboundStatus } from '@/lib/warehouse-state-machine';

async function allocateFIFO(
  conn: any,
  materialId: number,
  warehouseId: number,
  requiredQty: number
) {
  const [batches]: any = await conn.query(
    `SELECT 
      id, batch_no, material_id, material_code, material_name,
      available_qty, unit_price, inbound_date, unit
    FROM inv_inventory_batch 
    WHERE material_id = ? AND warehouse_id = ? AND available_qty > 0 AND deleted = 0 AND status = 'normal'
    ORDER BY inbound_date ASC, id ASC
    FOR UPDATE`,
    [materialId, warehouseId]
  );

  const result = {
    material_id: materialId,
    material_name: batches.length > 0 ? batches[0].material_name : '',
    required_qty: requiredQty,
    total_available: 0,
    allocated_qty: 0,
    shortage: 0,
    allocations: [] as any[],
  };

  result.total_available = batches.reduce(
    (sum: number, b: any) => sum + parseFloat(b.available_qty),
    0
  );

  let remaining = requiredQty;

  for (const batch of batches) {
    if (remaining <= 0) break;

    const availableQty = parseFloat(batch.available_qty);
    const allocateQty = Math.min(remaining, availableQty);

    result.allocations.push({
      batch_id: batch.id,
      batch_no: batch.batch_no,
      material_id: batch.material_id,
      material_code: batch.material_code,
      material_name: batch.material_name,
      allocate_qty: allocateQty,
      available_qty_before: availableQty,
      unit_cost: parseFloat(batch.unit_price) || 0,
      inbound_date: batch.inbound_date,
    });

    remaining -= allocateQty;
    result.allocated_qty += allocateQty;
  }

  result.shortage = Math.max(0, remaining);

  return result;
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, operatorId, operatorName, remark } = body;

  if (!id) {
    return errorResponse('出库单ID不能为空', 400);
  }

  const [order] = await query<{
    id: number;
    order_no: string;
    status: OutboundStatus;
    warehouse_id: number;
    warehouse_code: string;
    warehouse_name: string;
  }>(
    `SELECT id, order_no, status, warehouse_id, warehouse_code, warehouse_name
     FROM inv_outbound_order WHERE id = ? AND deleted = 0`,
    [id]
  );

  if (!order) {
    return errorResponse('出库单不存在', 404);
  }

  if (!WarehouseStateMachine.canConfirmOutbound(order.status)) {
    return errorResponse(
      `当前状态【${WarehouseStateMachine.getOutboundStatusLabel(order.status)}】不允许确认`,
      400
    );
  }

  const items = await query<{
    id: number;
    material_id: number;
    material_code: string;
    material_name: string;
    batch_no: string;
    qty: number;
    unit: string;
    location_code: string;
  }>(
    `SELECT id, material_id, material_code, material_name, batch_no, qty, unit, location_code
     FROM inv_outbound_item WHERE order_id = ? AND deleted = 0`,
    [id]
  );

  if (items.length === 0) {
    return errorResponse('出库单没有明细，不能确认', 400);
  }

  const deductionDetails: any[] = [];

  await transaction(async (connection) => {
    for (const item of items) {
      const requiredQty = parseFloat(String(item.qty));

      if (item.batch_no) {
        const [batch]: any = await connection.query(
          `SELECT id, batch_no, available_qty, quantity, version FROM inv_inventory_batch 
           WHERE batch_no = ? AND material_id = ? AND warehouse_id = ? AND deleted = 0
           FOR UPDATE`,
          [item.batch_no, item.material_id, order.warehouse_id]
        );

        if (batch.length === 0) {
          throw new Error(`库存批次不存在: ${item.batch_no}`);
        }

        const batchData = batch[0];
        if (parseFloat(batchData.available_qty) < requiredQty) {
          throw new Error(
            `库存不足: ${item.material_name}(${item.batch_no}), ` +
            `可用: ${batchData.available_qty}, 需要: ${requiredQty}`
          );
        }

        const [updateResult] = await connection.execute(
          `UPDATE inv_inventory_batch SET
            quantity = quantity - ?,
            available_qty = available_qty - ?,
            version = version + 1,
            update_time = NOW()
          WHERE id = ?`,
          [requiredQty, requiredQty, batchData.id]
        );

        if ((updateResult as any).affectedRows === 0) {
          throw new Error(`库存更新失败，可能已被其他操作修改: ${item.batch_no}`);
        }

        deductionDetails.push({
          batch_id: batchData.id,
          batch_no: item.batch_no,
          material_id: item.material_id,
          material_name: item.material_name,
          deducted_qty: requiredQty,
          mode: 'specified_batch',
        });

        await connection.execute(
          `INSERT INTO inv_inventory_transaction (
            trans_no, trans_type, batch_no, material_id, material_code, material_name,
            warehouse_id, warehouse_code, quantity, source_type, source_no,
            operated_by, operated_at, remark
          ) VALUES (?, 'outbound', ?, ?, ?, ?, ?, ?, ?, 'outbound_order', ?, ?, NOW(), ?)`,
          [
            `OUT${Date.now()}${item.id}`,
            item.batch_no,
            item.material_id,
            item.material_code,
            item.material_name,
            order.warehouse_id,
            order.warehouse_code,
            -requiredQty,
            order.order_no,
            operatorId,
            remark || '',
          ]
        );
      } else {
        const allocation = await allocateFIFO(connection, item.material_id, order.warehouse_id, requiredQty);

        if (allocation.shortage > 0) {
          throw new Error(
            `物料 ${item.material_name} 库存不足: 需要 ${requiredQty}, 可用 ${allocation.total_available}, 缺少 ${allocation.shortage}`
          );
        }

        for (const alloc of allocation.allocations) {
          const [updateResult] = await connection.execute(
            `UPDATE inv_inventory_batch SET
              quantity = quantity - ?,
              available_qty = available_qty - ?,
              version = version + 1,
              update_time = NOW()
            WHERE id = ?`,
            [alloc.allocate_qty, alloc.allocate_qty, alloc.batch_id]
          );

          if ((updateResult as any).affectedRows === 0) {
            throw new Error(`FIFO库存更新失败: 批次${alloc.batch_no}`);
          }

          deductionDetails.push({
            batch_id: alloc.batch_id,
            batch_no: alloc.batch_no,
            material_id: alloc.material_id,
            material_name: alloc.material_name,
            deducted_qty: alloc.allocate_qty,
            unit_cost: alloc.unit_cost,
            mode: 'fifo_auto',
          });

          await connection.execute(
            `INSERT INTO inv_inventory_transaction (
              trans_no, trans_type, batch_no, material_id, material_code, material_name,
              warehouse_id, warehouse_code, quantity, source_type, source_no,
              operated_by, operated_at, remark
            ) VALUES (?, 'outbound', ?, ?, ?, ?, ?, ?, ?, 'outbound_order', ?, ?, NOW(), ?)`,
            [
              `OUT${Date.now()}${alloc.batch_id}`,
              alloc.batch_no,
              alloc.material_id,
              alloc.material_code,
              alloc.material_name,
              order.warehouse_id,
              order.warehouse_code,
              -alloc.allocate_qty,
              order.order_no,
              operatorId,
              `FIFO出库-批次${alloc.batch_no}`,
            ]
          );
        }

        await connection.execute(
          `UPDATE inv_outbound_item SET batch_no = ? WHERE id = ?`,
          [allocation.allocations.map((a: any) => a.batch_no).join(','), item.id]
        );
      }

      await connection.execute(
        `UPDATE inv_inventory SET
          quantity = quantity - ?,
          available_qty = available_qty - ?,
          update_time = NOW()
        WHERE material_id = ? AND warehouse_id = ?`,
        [requiredQty, requiredQty, item.material_id, order.warehouse_id]
      );
    }

    await connection.execute(
      `UPDATE inv_outbound_order SET
        status = 'completed',
        audit_status = 1,
        auditor_id = ?,
        auditor_name = ?,
        audit_time = NOW(),
        audit_remark = ?,
        version = version + 1,
        update_time = NOW()
      WHERE id = ?`,
      [operatorId, operatorName, remark || '', id]
    );
  });

  return successResponse(
    {
      orderId: id,
      orderNo: order.order_no,
      status: 'completed',
      deductionDetails,
      totalDeductedBatches: deductionDetails.length,
    },
    '出库单确认成功，库存已按先进先出扣减'
  );
}, '确认出库失败');

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, operatorId, operatorName, remark } = body;

  if (!id) {
    return errorResponse('出库单ID不能为空', 400);
  }

  const [order] = await query<{
    id: number;
    order_no: string;
    status: OutboundStatus;
    warehouse_id: number;
  }>(
    `SELECT id, order_no, status, warehouse_id FROM inv_outbound_order WHERE id = ? AND deleted = 0`,
    [id]
  );

  if (!order) {
    return errorResponse('出库单不存在', 404);
  }

  if (!WarehouseStateMachine.canTransitionOutbound(order.status, 'pending')) {
    return errorResponse(
      WarehouseStateMachine.getTransitionError('outbound', order.status, 'pending'),
      400
    );
  }

  const items = await query<{
    material_id: number;
    batch_no: string;
    qty: number;
  }>(
    `SELECT material_id, batch_no, qty FROM inv_outbound_item WHERE order_id = ? AND deleted = 0`,
    [id]
  );

  await transaction(async (connection) => {
    for (const item of items) {
      const batchNos = item.batch_no ? item.batch_no.split(',') : [];

      if (batchNos.length <= 1) {
        const [updateResult] = await connection.execute(
          `UPDATE inv_inventory_batch SET
            quantity = quantity + ?,
            available_qty = available_qty + ?,
            version = version + 1,
            update_time = NOW()
          WHERE batch_no = ? AND material_id = ? AND warehouse_id = ?`,
          [item.qty, item.qty, item.batch_no, item.material_id, order.warehouse_id]
        );

        if ((updateResult as any).affectedRows === 0) {
          throw new Error(`库存恢复失败，可能已被其他操作修改: ${item.batch_no}`);
        }
      } else {
        const qtyPerBatch = item.qty / batchNos.length;
        for (const bNo of batchNos) {
          const trimmed = bNo.trim();
          if (!trimmed) continue;
          await connection.execute(
            `UPDATE inv_inventory_batch SET
              quantity = quantity + ?,
              available_qty = available_qty + ?,
              version = version + 1,
              update_time = NOW()
            WHERE batch_no = ? AND material_id = ? AND warehouse_id = ?`,
            [qtyPerBatch, qtyPerBatch, trimmed, item.material_id, order.warehouse_id]
          );
        }
      }

      await connection.execute(
        `UPDATE inv_inventory SET
          quantity = quantity + ?,
          available_qty = available_qty + ?,
          update_time = NOW()
        WHERE material_id = ? AND warehouse_id = ?`,
        [item.qty, item.qty, item.material_id, order.warehouse_id]
      );

      await connection.execute(
        `INSERT INTO inv_inventory_transaction (
          trans_no, trans_type, batch_no, material_id,
          warehouse_id, quantity, source_type, source_no,
          operated_by, operated_at, remark
        ) VALUES (?, 'outbound_cancel', ?, ?, ?, ?, 'outbound_order', ?, ?, NOW(), ?)`,
        [
          `OUTC${Date.now()}${item.material_id}`,
          item.batch_no,
          item.material_id,
          order.warehouse_id,
          item.qty,
          order.order_no,
          operatorId,
          `撤销出库: ${remark || ''}`,
        ]
      );
    }

    await connection.execute(
      `UPDATE inv_outbound_order SET
        status = 'pending',
        audit_status = 0,
        auditor_id = NULL,
        auditor_name = NULL,
        audit_time = NULL,
        version = version + 1,
        audit_remark = ?,
        update_time = NOW()
      WHERE id = ?`,
      [`撤销出库: ${remark || ''} 操作人: ${operatorName || ''}`, id]
    );
  });

  return successResponse(
    { orderId: id, orderNo: order.order_no, status: 'pending' },
    '出库单撤销成功，库存已恢复'
  );
}, '撤销出库失败');
