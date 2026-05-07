import { NextRequest } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  withErrorHandler,
  logOperation,
} from '@/lib/api-response';
import { WarehouseStateMachine, OutboundStatus } from '@/lib/warehouse-state-machine';
import { allocateFIFO, executeFIFODeduction, executeSpecifiedBatchDeduction } from '@/lib/fifo-allocation';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, operatorId, operatorName, remark } = body;

  if (!id) {
    return errorResponse('出库单ID不能为空', 400);
  }

  const deductionDetails: any[] = [];

  await transaction(async (connection) => {
    const [orderRows]: any = await connection.execute(
      `SELECT id, order_no, status, warehouse_id, warehouse_code, warehouse_name, version
       FROM inv_outbound_order WHERE id = ? AND deleted = 0 FOR UPDATE`,
      [id]
    );

    if (!orderRows || orderRows.length === 0) {
      throw new Error('NOT_FOUND:出库单不存在');
    }

    const orderRow = orderRows[0];

    if (!WarehouseStateMachine.canConfirmOutbound(orderRow.status)) {
      throw new Error(`BAD_REQUEST:当前状态【${WarehouseStateMachine.getOutboundStatusLabel(orderRow.status)}】不允许确认`);
    }

    const [itemRows]: any = await connection.execute(
      `SELECT id, material_id, material_code, material_name, batch_no, qty, unit, location_code
       FROM inv_outbound_item WHERE order_id = ? AND deleted = 0`,
      [id]
    );

    if (!itemRows || itemRows.length === 0) {
      throw new Error('BAD_REQUEST:出库单没有明细，不能确认');
    }

    for (const item of itemRows) {
      const requiredQty = parseFloat(String(item.qty));

      if (item.batch_no) {
        const { deductionDetail } = await executeSpecifiedBatchDeduction(connection, {
          batchNo: item.batch_no,
          materialId: item.material_id,
          materialCode: item.material_code,
          materialName: item.material_name,
          warehouseId: orderRow.warehouse_id,
          warehouseCode: orderRow.warehouse_code,
          requiredQty,
          sourceType: 'outbound_order',
          sourceId: id,
          sourceNo: orderRow.order_no,
          operatorId: operatorId || null,
          operatorName: operatorName || null,
        });
        deductionDetails.push(deductionDetail);
      } else {
        const allocation = await allocateFIFO(connection, item.material_id, orderRow.warehouse_id, requiredQty);

        if (allocation.shortage > 0) {
          throw new Error(
            `物料 ${item.material_name} 库存不足: 需要 ${requiredQty}, 可用 ${allocation.total_available}, 缺少 ${allocation.shortage}`
          );
        }

        const { deductionDetails: fifoDetails } = await executeFIFODeduction(connection, allocation, {
          sourceType: 'outbound_order',
          sourceId: id,
          sourceNo: orderRow.order_no,
          warehouseId: orderRow.warehouse_id,
          warehouseCode: orderRow.warehouse_code,
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
        [requiredQty, requiredQty, item.material_id, orderRow.warehouse_id]
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
      WHERE id = ? AND version = ?`,
      [operatorId, operatorName, remark || '', id, orderRow.version]
    );
  }).catch((error) => {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.startsWith('NOT_FOUND:')) return errorResponse(msg.slice(10), 404);
    if (msg.startsWith('BAD_REQUEST:')) return errorResponse(msg.slice(12), 400);
    throw error;
  });

  await logOperation({
    title: '确认出库',
    oper_name: operatorName,
    oper_type: 'warehouse',
    oper_method: 'POST',
    oper_url: '/api/warehouse/outbound/confirm',
    oper_param: JSON.stringify({ id, operatorId }),
    oper_result: `出库单确认成功，扣减${deductionDetails.length}个批次`,
    status: 1,
  });

  return successResponse(
    {
      orderId: id,
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

  let orderNo = '';

  await transaction(async (connection) => {
    const [orderRows]: any = await connection.execute(
      `SELECT id, order_no, status, warehouse_id, version
       FROM inv_outbound_order WHERE id = ? AND deleted = 0 FOR UPDATE`,
      [id]
    );

    if (!orderRows || orderRows.length === 0) {
      throw new Error('NOT_FOUND:出库单不存在');
    }

    const order = orderRows[0];
    orderNo = order.order_no;

    if (!WarehouseStateMachine.canTransitionOutbound(order.status, 'pending')) {
      throw new Error(`BAD_REQUEST:${WarehouseStateMachine.getTransitionError('outbound', order.status, 'pending')}`);
    }

    const [itemRows]: any = await connection.execute(
      `SELECT material_id, batch_no, qty FROM inv_outbound_item WHERE order_id = ? AND deleted = 0`,
      [id]
    );

    for (const item of (itemRows || [])) {
      const batchNos = item.batch_no ? item.batch_no.split(',').map((b: string) => b.trim()).filter(Boolean) : [];

      if (batchNos.length <= 1) {
        const [updateResult]: any = await connection.execute(
          `UPDATE inv_inventory_batch SET
            quantity = quantity + ?,
            available_qty = available_qty + ?,
            version = version + 1,
            update_time = NOW()
          WHERE batch_no = ? AND material_id = ? AND warehouse_id = ?`,
          [item.qty, item.qty, item.batch_no, item.material_id, order.warehouse_id]
        );

        if (updateResult.affectedRows === 0) {
          throw new Error(`库存恢复失败，可能已被其他操作修改: ${item.batch_no}`);
        }
      } else {
        const [allocations]: any = await connection.execute(
          `SELECT batch_no, allocated_qty FROM inv_outbound_batch_allocation
           WHERE source_id = ? AND material_id = ? AND source_type = 'outbound_order'
           ORDER BY batch_no`,
          [id, item.material_id]
        );

        if (allocations && allocations.length > 0) {
          for (const alloc of allocations) {
            await connection.execute(
              `UPDATE inv_inventory_batch SET
                quantity = quantity + ?,
                available_qty = available_qty + ?,
                version = version + 1,
                update_time = NOW()
              WHERE batch_no = ? AND material_id = ? AND warehouse_id = ?`,
              [alloc.allocated_qty, alloc.allocated_qty, alloc.batch_no, item.material_id, order.warehouse_id]
            );
          }
        } else {
          const qtyPerBatch = item.qty / batchNos.length;
          for (const bNo of batchNos) {
            await connection.execute(
              `UPDATE inv_inventory_batch SET
                quantity = quantity + ?,
                available_qty = available_qty + ?,
                version = version + 1,
                update_time = NOW()
              WHERE batch_no = ? AND material_id = ? AND warehouse_id = ?`,
              [qtyPerBatch, qtyPerBatch, bNo, item.material_id, order.warehouse_id]
            );
          }
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
      WHERE id = ? AND version = ?`,
      [`撤销出库: ${remark || ''} 操作人: ${operatorName || ''}`, id, order.version]
    );
  }).catch((error) => {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.startsWith('NOT_FOUND:')) return errorResponse(msg.slice(10), 404);
    if (msg.startsWith('BAD_REQUEST:')) return errorResponse(msg.slice(12), 400);
    throw error;
  });

  await logOperation({
    title: '撤销出库',
    oper_name: operatorName,
    oper_type: 'warehouse',
    oper_method: 'PUT',
    oper_url: '/api/warehouse/outbound/confirm',
    oper_param: JSON.stringify({ id, operatorId }),
    oper_result: `出库单 ${orderNo} 撤销成功，库存已恢复`,
    status: 1,
  });

  return successResponse(
    { orderId: id, orderNo, status: 'pending' },
    '出库单撤销成功，库存已恢复'
  );
}, '撤销出库失败');
