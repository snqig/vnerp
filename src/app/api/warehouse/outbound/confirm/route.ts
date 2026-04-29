import { NextRequest } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  withErrorHandler,
} from '@/lib/api-response';
import { WarehouseStateMachine, OutboundStatus } from '@/lib/warehouse-state-machine';
import { allocateFIFO, executeFIFODeduction, executeSpecifiedBatchDeduction } from '@/lib/fifo-allocation';

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
        const { deductionDetail } = await executeSpecifiedBatchDeduction(connection, {
          batchNo: item.batch_no,
          materialId: item.material_id,
          materialCode: item.material_code,
          materialName: item.material_name,
          warehouseId: order.warehouse_id,
          warehouseCode: order.warehouse_code,
          requiredQty,
          sourceType: 'outbound_order',
          sourceId: id,
          sourceNo: order.order_no,
          operatorId: operatorId || null,
          operatorName: operatorName || null,
        });
        deductionDetails.push(deductionDetail);
      } else {
        const allocation = await allocateFIFO(connection, item.material_id, order.warehouse_id, requiredQty);

        if (allocation.shortage > 0) {
          throw new Error(
            `物料 ${item.material_name} 库存不足: 需要 ${requiredQty}, 可用 ${allocation.total_available}, 缺少 ${allocation.shortage}`
          );
        }

        const { deductionDetails: fifoDetails } = await executeFIFODeduction(connection, allocation, {
          sourceType: 'outbound_order',
          sourceId: id,
          sourceNo: order.order_no,
          warehouseId: order.warehouse_id,
          warehouseCode: order.warehouse_code,
          operatorId: operatorId || null,
          operatorName: operatorName || null,
        });

        deductionDetails.push(...fifoDetails);

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
