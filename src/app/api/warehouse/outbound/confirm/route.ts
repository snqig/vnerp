import { getTranslations } from 'next-intl/server';

;
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
import { planWidthSlitAllocation, executeWidthSlitDeduction } from '@/lib/fifo-width-slit';
import { logger } from '@/lib/logger';
import { appendInventoryTransaction, recomputeInventorySummary } from '@/lib/inventory-ledger';
import type { DbRow } from '@/types/db';

export const POST = withPermission(
  async (request: NextRequest, userInfo) => {
  const tc = await getTranslations('Common');
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { id, remark } = body;
    // 操作人优先用前端传值，缺失时从 JWT 兜底
    const operatorId = body.operatorId ?? userInfo.userId;
    const operatorName = body.operatorName || userInfo.realName || userInfo.username;

    logger.debug(
      `[OUTBOUND] Confirm outbound request received - id: ${id}, operatorId: ${operatorId}, operatorName: ${operatorName}`
    );

    if (!id) {
      return errorResponse(ts('k_1ddnsve'), 400);
    }

    // 事务内错误的 Response 必须经 txCtl 载体显式带出：
    // 在 .catch 回调里直接 return 会被丢弃，导致 NOT_FOUND 变 200 假成功
    const txCtl: { error: ReturnType<typeof errorResponse> | null } = { error: null };
    const deductionDetails: DbRow[] = [];

    await transaction(async (connection) => {
      logger.debug(`[OUTBOUND] Starting transaction for outbound order: ${id}`);

      const [orderRows] = await connection.execute(
        `SELECT id, order_no, status, warehouse_id, warehouse_code, warehouse_name, version
       FROM inv_outbound_order WHERE id = ? AND deleted = 0 FOR UPDATE`,
        [id]
      );

      if (!orderRows || orderRows.length === 0) {
        throw new Error(ts('k_uhw8cc'));
      }

      const orderRow = orderRows[0];
      logger.debug(
        `[OUTBOUND] Found order: id=${orderRow.id}, order_no=${orderRow.order_no}, status=${orderRow.status}, warehouse_id=${orderRow.warehouse_id}`
      );

      if (!WarehouseStateMachine.canConfirmOutbound(orderRow.status)) {
        throw new Error(
          `BAD_REQUEST:当前状态【${WarehouseStateMachine.getOutboundStatusLabel(orderRow.status)}】不允许确认`
        );
      }

      const [itemRows] = await connection.execute(
        `SELECT id, material_id, material_name, batch_no, quantity, unit
       FROM inv_outbound_item WHERE order_id = ? AND deleted = 0`,
        [id]
      );

      logger.debug(`[OUTBOUND] Found ${itemRows.length} items for order: ${id}`);

      if (!itemRows || itemRows.length === 0) {
        throw new Error(ts('k_xb93o0'));
      }

      for (const item of itemRows) {
        const requiredQty = parseFloat(String(item.quantity));
        logger.debug(
          `[OUTBOUND] Processing item: id=${item.id}, material_id=${item.material_id}, material_name=${item.material_name}, qty=${requiredQty}, batch_no=${item.batch_no}`
        );

        if (item.batch_no) {
          logger.debug(
            `[OUTBOUND] Using specified batch deduction for item ${item.id}, batch_no=${item.batch_no}`
          );
          const { deductionDetail } = await executeSpecifiedBatchDeduction(connection, {
            batchNo: item.batch_no,
            materialId: item.material_id,
            materialCode: '',
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
          logger.debug(
            `[OUTBOUND] Specified batch deduction completed - batch_no=${item.batch_no}, deducted_qty=${deductionDetail.deducted_qty}`
          );
        } else {
          logger.debug(
            `[OUTBOUND] Using FIFO allocation for item ${item.id}, material_id=${item.material_id}, requiredQty=${requiredQty}`
          );

          // 宽度感知 FIFO 横切：长度类物料按需求宽度优先精确匹配，否则横切更宽母卷
          const [matRows] = await connection.execute(
            `SELECT width FROM inv_material WHERE id = ? AND deleted = 0`,
            [item.material_id]
          );
          const matRow = (matRows && matRows[0]) || null;
          const itemWidth = parseFloat(item.width) || 0;
          const materialWidth = matRow ? parseFloat(matRow.width) || 0 : 0;
          // 尺寸类判定：物料有标称宽度即可（长度取自批次，按需横切时再取母批 length）
          const dimensional = materialWidth > 0;
          const requiredWidth = itemWidth > 0 ? itemWidth : materialWidth;

          if (dimensional && requiredWidth > 0) {
            logger.debug(
              `[OUTBOUND] Width-aware allocation (dimensional) - requiredWidth=${requiredWidth}`
            );
            const plan = await planWidthSlitAllocation(
              connection,
              item.material_id,
              orderRow.warehouse_id,
              requiredQty,
              requiredWidth
            );
            if (plan.shortage > 0) {
              throw new Error(
                `物料 ${item.material_name} 库存不足(按宽度${requiredWidth}mm): 需要 ${requiredQty}, 可产出 ${plan.total_available}, 缺少 ${plan.shortage}`
              );
            }
            const { deductionDetails: slitDetails } = await executeWidthSlitDeduction(
              connection,
              plan,
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
            deductionDetails.push(...slitDetails);
            const batchNos = plan.allocations.map((a: DbRow) => a.batch_no).join(',');
            const batchIds = plan.allocations.map((a: DbRow) => a.batch_id).join(',');
            const inboundDates = plan.allocations.map((a: DbRow) => a.original_inbound_date || a.inbound_date || null).join(',');
            await connection.execute(`UPDATE inv_outbound_item SET batch_no = ?, batch_id = ?, original_inbound_date = ? WHERE id = ?`, [
              batchNos,
              batchIds,
              inboundDates,
              item.id,
            ]);
            logger.debug(
              `[OUTBOUND] Width-slit deduction completed - ${slitDetails.length} allocations`
            );
          } else {
            const allocation = await allocateFIFO(
              connection,
              item.material_id,
              orderRow.warehouse_id,
              requiredQty
            );

            logger.debug(
              `[OUTBOUND] FIFO allocation result - allocated_qty=${allocation.allocated_qty}, shortage=${allocation.shortage}, total_available=${allocation.total_available}`
            );

            if (allocation.shortage > 0) {
              throw new Error(
                `物料 ${item.material_name} 库存不足: 需要 ${requiredQty}, 可用 ${allocation.total_available}, 缺少 ${allocation.shortage}`
              );
            }

            logger.debug(
              `[OUTBOUND] Executing FIFO deduction with ${allocation.allocations.length} allocations`
            );
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
            logger.debug(
              `[OUTBOUND] FIFO deduction completed - ${fifoDetails.length} batches deducted`
            );

            const batchNos = allocation.allocations.map((a: DbRow) => a.batch_no).join(',');
            const batchIds = allocation.allocations.map((a: DbRow) => a.batch_id).join(',');
            const inboundDates = allocation.allocations.map((a: DbRow) => a.inbound_date || null).join(',');
            await connection.execute(`UPDATE inv_outbound_item SET batch_no = ?, batch_id = ?, original_inbound_date = ? WHERE id = ?`, [
              batchNos,
              batchIds,
              inboundDates,
              item.id,
            ]);
            logger.debug(`[OUTBOUND] Updated item ${item.id} with batch_no: ${batchNos}`);
          }
        }

        // 财务级库存流水（与扣减同事务，任一步失败整体回滚）
        await appendInventoryTransaction(connection, {
          transType: 'out',
          sourceType: 'outbound_order',
          sourceId: orderRow.id,
          sourceLineId: item.id,
          materialId: item.material_id,
          batchNo: item.batch_no || null,
          warehouseId: orderRow.warehouse_id,
          quantity: requiredQty,
          locationId: item.location_id || null,
          referenceNo: orderRow.order_no,
          remark: `销售出库扣减: ${item.material_name}`,
          createBy: operatorId || null,
        });
        // 汇总表由批次明细派生重算，杜绝双写漂移（与 outbound/fifo 一致）
        await recomputeInventorySummary(connection, item.material_id, orderRow.warehouse_id);
      }

      const [orderUpdateResult] = await connection.execute(
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
      if (orderUpdateResult.affectedRows === 0) {
        throw new Error(ts('k_166xnaj'));
      }

      // 自动生成应收单（如果出库单关联了客户）
      const [orderInfo] = await connection.execute(
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

      // 注：sales_order/sales_order_item 为幽灵表（live 库不存在），原累计出库/状态回写块已删除。
      // 销售出库进度如需统计，应基于真实表 sal_order 另行实现。
    }).catch((error) => {
      const msg = error instanceof Error ? error.message : String(error);
      // i18n 翻译值可能自带前缀，防御性剥离重复前缀；经 txCtl 显式带出
      if (msg.startsWith('NOT_FOUND:')) {
        txCtl.error = errorResponse(msg.replace(/^(NOT_FOUND:)+/, ''), 404);
        return;
      }
      if (msg.startsWith('BAD_REQUEST:')) {
        txCtl.error = errorResponse(msg.replace(/^(BAD_REQUEST:)+/, ''), 400);
        return;
      }
      throw error;
    });

    if (txCtl.error) return txCtl.error;

    await logOperation({
      title: tc('confirmIssue'),
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
      ts('k_1k441j5')
    );
  },
  { errorMessage: '确认出库失败' }
);

export const PUT = withPermission(
  async (request: NextRequest, userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { id, remark } = body;
    // 操作人优先用前端传值，缺失时从 JWT 兜底
    const operatorId = body.operatorId ?? userInfo.userId;
    const operatorName = body.operatorName || userInfo.realName || userInfo.username;

    if (!id) {
      return errorResponse(ts('k_1ddnsve'), 400);
    }

    let orderNo = '';

    // 同 POST：错误 Response 经 txCtl 载体显式带出，避免 404 变 200 假成功
    const txCtl: { error: ReturnType<typeof errorResponse> | null } = { error: null };

    await transaction(async (connection) => {
      const [orderRows] = await connection.execute(
        `SELECT id, order_no, status, warehouse_id, version
       FROM inv_outbound_order WHERE id = ? AND deleted = 0 FOR UPDATE`,
        [id]
      );

      if (!orderRows || orderRows.length === 0) {
        throw new Error(ts('k_uhw8cc'));
      }

      const order = orderRows[0];
      orderNo = order.order_no;

      if (!WarehouseStateMachine.canTransitionOutbound(order.status, 'pending')) {
        throw new Error(
          `BAD_REQUEST:${WarehouseStateMachine.getTransitionError('outbound', order.status, 'pending')}`
        );
      }

      const [itemRows] = await connection.execute(
        `SELECT material_id, batch_no, quantity FROM inv_outbound_item WHERE order_id = ? AND deleted = 0`,
        [id]
      );

      for (const item of itemRows || []) {
        const batchNos = item.batch_no
          ? item.batch_no
              .split(',')
              .map((b: string) => b.trim())
              .filter(Boolean)
          : [];

        // 恢复库存的 SQL 统一走这里：quantity/available_qty 加回，同时按面积守恒重算 area
        // ⚠️ MySQL 的 UPDATE ... SET 左到右求值：area 放在 quantity 之后时，
        // 语句里的 quantity 已是新值，直接乘即可；写成 (quantity + ?) 会重复加一次。
        const restoreBatch = async (batchNo: string, qty: number) => {
          const [r] = await connection.execute(
            `UPDATE inv_inventory_batch SET
              quantity = quantity + ?,
              available_qty = available_qty + ?,
              area = COALESCE(width,0) * COALESCE(length,0) * quantity,
              available_area = COALESCE(width,0) * COALESCE(length,0) * available_qty,
              version = version + 1,
              update_time = NOW()
            WHERE batch_no = ? AND material_id = ? AND warehouse_id = ?`,
            [qty, qty, batchNo, item.material_id, order.warehouse_id]
          );
          return (r?.affectedRows ?? 0) as number;
        };

        // 优先按分配明细精确回滚（不能只在多批次时才查）：
        // 宽度横切场景下 inv_outbound_item.batch_no 只有 1 个母批号，
        // 但需要回滚的是「面积当量」而非出库单上的窄卷数量，走 item.quantity 会把库存加多。
        const [allocations] = await connection.execute(
          `SELECT batch_no, allocated_qty FROM inv_outbound_batch_allocation
           WHERE source_id = ? AND material_id = ? AND source_type = 'outbound_order'
           ORDER BY batch_no`,
          [id, item.material_id]
        );

        if (allocations && allocations.length > 0) {
          for (const alloc of allocations) {
            await restoreBatch(alloc.batch_no, parseFloat(String(alloc.allocated_qty)));
          }
          // 回滚后删除分配明细，避免二次确认/撤销时重复回滚
          await connection.execute(
            `DELETE FROM inv_outbound_batch_allocation
             WHERE source_id = ? AND material_id = ? AND source_type = 'outbound_order'`,
            [id, item.material_id]
          );
        } else if (batchNos.length <= 1) {
          const affected = await restoreBatch(item.batch_no, item.quantity);
          if (affected === 0) {
            throw new Error(`库存恢复失败，可能已被其他操作修改: ${item.batch_no}`);
          }
        } else {
          const qtyPerBatch = item.quantity / batchNos.length;
          for (const bNo of batchNos) {
            await restoreBatch(bNo, qtyPerBatch);
          }
        }

        // 财务级库存流水（撤销=反向流水，与恢复同事务）
        await appendInventoryTransaction(connection, {
          transType: 'return',
          sourceType: 'outbound_order',
          sourceId: order.id,
          materialId: item.material_id,
          batchNo: item.batch_no || null,
          warehouseId: order.warehouse_id,
          quantity: parseFloat(String(item.quantity)),
          referenceNo: order.order_no,
          remark: `撤销出库: ${remark || ''}`,
          createBy: operatorId || null,
        });
        // 汇总表由批次明细派生重算，杜绝双写漂移
        await recomputeInventorySummary(connection, item.material_id, order.warehouse_id);
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
      // i18n 翻译值可能自带前缀，防御性剥离重复前缀；经 txCtl 显式带出
      if (msg.startsWith('NOT_FOUND:')) {
        txCtl.error = errorResponse(msg.replace(/^(NOT_FOUND:)+/, ''), 404);
        return;
      }
      if (msg.startsWith('BAD_REQUEST:')) {
        txCtl.error = errorResponse(msg.replace(/^(BAD_REQUEST:)+/, ''), 400);
        return;
      }
      throw error;
    });

    if (txCtl.error) return txCtl.error;

    await logOperation({
      title: ts('k_1pv4eum'),
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
      ts('k_10s3gya')
    );
  },
  { errorMessage: '撤销出库失败' }
);
