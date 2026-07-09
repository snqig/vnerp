import { NextRequest } from 'next/server';
import { transaction } from '@/lib/db';
import { successResponse, errorResponse, logOperation } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { WarehouseStateMachine } from '@/domain/warehouse/value-objects/WarehouseStateMachine';
import {
  allocateFIFO,
  executeFIFODeductionWithRetry,
  executeSpecifiedBatchDeduction,
} from '@/lib/fifo-allocation';

export const POST = withPermission(
  async (request: NextRequest) => {
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
        throw new Error(
          `BAD_REQUEST:当前状态【${WarehouseStateMachine.getOutboundStatusLabel(orderRow.status)}】不允许确认`
        );
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
          const allocation = await allocateFIFO(
            connection,
            item.material_id,
            orderRow.warehouse_id,
            requiredQty
          );

          if (allocation.shortage > 0) {
            throw new Error(
              `物料 ${item.material_name} 库存不足: 需要 ${requiredQty}, 可用 ${allocation.total_available}, 缺少 ${allocation.shortage}`
            );
          }

          const { deductionDetails: fifoDetails } = await executeFIFODeductionWithRetry(
            connection,
            allocation,
            {
              sourceType: 'outbound_order',
              sourceId: id,
              sourceNo: orderRow.order_no,
              warehouseId: orderRow.warehouse_id,
              warehouseCode: orderRow.warehouse_code,
              operatorId: operatorId || null,
              operatorName: operatorName || null,
            }
          );

          deductionDetails.push(...fifoDetails);

          await connection.execute(`UPDATE inv_outbound_item SET batch_no = ? WHERE id = ?`, [
            allocation.allocations.map((a: any) => a.batch_no).join(','),
            item.id,
          ]);
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

      // 自动生成应收单（如果出库单关联了客户）
      const [orderInfo]: any = await connection.execute(
        `SELECT customer_id, customer_name, total_amount, sales_order_no FROM inv_outbound_order WHERE id = ?`,
        [id]
      );

      if (orderInfo && orderInfo.length > 0 && orderInfo[0].customer_id) {
        const customer = orderInfo[0];
        const receivableNo = 'AR' + Date.now();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // 默认30天账期

        await connection.execute(
          `INSERT INTO fin_receivable (
          receivable_no, customer_id, customer_name, amount, received_amount,
          status, source_type, source_no, source_id,
          due_date, remark, create_time, update_time, deleted
        ) VALUES (?, ?, ?, ?, 0, 1, 'outbound_order', ?, ?, ?, ?, NOW(), NOW(), 0)`,
          [
            receivableNo,
            customer.customer_id,
            customer.customer_name,
            customer.total_amount || 0,
            orderRow.order_no,
            id,
            dueDate.toISOString().split('T')[0],
            `销售出库自动生成 - ${orderRow.order_no}`,
          ]
        );
      }

      // 更新销售订单累计出库数量（如果关联了销售订单）
      if (orderInfo && orderInfo.length > 0 && orderInfo[0].sales_order_no) {
        const salesOrderNo = orderInfo[0].sales_order_no;

        const totalOutQty = itemRows.reduce(
          (sum: number, item: any) => sum + parseFloat(String(item.qty)),
          0
        );

        await connection.execute(
          `UPDATE sales_order SET
          total_out_quantity = COALESCE(total_out_quantity, 0) + ?,
          update_time = NOW()
        WHERE order_no = ?`,
          [totalOutQty, salesOrderNo]
        );

        // 检查是否全部出库完成
        const [soItems]: any = await connection.execute(
          `SELECT SUM(quantity) as total_qty FROM sales_order_item WHERE sales_order_id = (SELECT id FROM sales_order WHERE order_no = ?)`,
          [salesOrderNo]
        );
        const [soOutbound]: any = await connection.execute(
          `SELECT COALESCE(total_out_quantity, 0) as total_out FROM sales_order WHERE order_no = ?`,
          [salesOrderNo]
        );

        if (soItems[0]?.total_qty && soOutbound[0]?.total_out >= soItems[0].total_qty) {
          await connection.execute(
            `UPDATE sales_order SET status = 3, update_time = NOW() WHERE order_no = ? AND status != 9`,
            [salesOrderNo]
          );
        } else if (soOutbound[0]?.total_out > 0) {
          await connection.execute(
            `UPDATE sales_order SET status = 2, update_time = NOW() WHERE order_no = ? AND status = 1`,
            [salesOrderNo]
          );
        }
      }
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
  },
  { errorMessage: '确认出库失败' }
);

export const PUT = withPermission(
  async (request: NextRequest) => {
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
        throw new Error(
          `BAD_REQUEST:${WarehouseStateMachine.getTransitionError('outbound', order.status, 'pending')}`
        );
      }

      const [itemRows]: any = await connection.execute(
        `SELECT material_id, batch_no, qty FROM inv_outbound_item WHERE order_id = ? AND deleted = 0`,
        [id]
      );

      for (const item of itemRows || []) {
        const batchNos = item.batch_no
          ? item.batch_no
              .split(',')
              .map((b: string) => b.trim())
              .filter(Boolean)
          : [];

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
                [
                  alloc.allocated_qty,
                  alloc.allocated_qty,
                  alloc.batch_no,
                  item.material_id,
                  order.warehouse_id,
                ]
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
  },
  { errorMessage: '撤销出库失败' }
);
