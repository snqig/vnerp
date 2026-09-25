/**
 * @module 出库单确认/撤销 业务编排服务
 * @description
 *   将 `warehouse/outbound/confirm/route.ts` 中纠缠在控制器里的业务编排逻辑下沉到本服务，
 *   使路由只负责「解析请求 → 包事务 → 映射错误 → 记操作日志 → 响应」。
 *
 *   本服务只做编排，不直接持有 HTTP 上下文；所有 DB 操作复用调用方传入的事务连接
 *   （conn），由路由通过 `transaction()` 统一提交/回滚。
 *
 *   ⚠️ 行为保持与历史路由完全一致（包括已知的若干历史细节，如：
 *     - 出库明细 SELECT 未取 `item.width`，故宽度分支恒取物料标称宽度 `materialWidth`；
 *     - 库存不足 / 状态非法等错误沿用 `BAD_REQUEST:` 前缀，由路由映射到 400；
 *     - 订单不存在等 i18n 文案不加前缀，沿用历史透传行为）。
 *   重构目标=可测试 + 职责清晰，而非改变业务语义。
 */

import type { DbConnection, DbRow, DbResultSetHeader } from '@/types/db';
import {
  WarehouseStateMachine,
  type OutboundStatus,
} from '@/domain/warehouse/value-objects/WarehouseStateMachine';
import {
  allocateFIFO,
  executeFIFODeductionWithRetry,
  executeSpecifiedBatchDeduction,
} from '@/lib/fifo-allocation';
import { planWidthSlitAllocation, executeWidthSlitDeduction } from '@/lib/fifo-width-slit';
import { appendInventoryTransaction, recomputeInventorySummary } from '@/lib/inventory-ledger';
import { logger } from '@/lib/logger';

/** i18n 翻译函数（next-intl 的 TFunction 子集） */
export type TranslateFn = (key: string, values?: Record<string, unknown>) => string;

export interface ConfirmOutboundInput {
  id: string | number;
  remark?: string | null;
  operatorId: number | null;
  operatorName: string | null;
  t: TranslateFn;
}

export interface CancelOutboundInput {
  id: string | number;
  remark?: string | null;
  operatorId: number | null;
  operatorName: string | null;
  t: TranslateFn;
}

export interface OutboundConfirmResult {
  deductionDetails: DbRow[];
}

export interface OutboundCancelResult {
  orderNo: string;
}

/**
 * 确认出库（核心编排，运行于事务内，conn 复用外层事务）。
 *
 * 流程：锁定订单 → 校验可确认状态 → 逐明细扣减（指定批次 / 宽度横切 / FIFO）→
 * 逐明细写库存流水 + 重算汇总 → 订单置 completed → 关联客户自动生成应收单 →
 * 关联销售单回写发货进度（幂等）。
 */
export async function confirmOutboundTx(
  conn: DbConnection,
  input: ConfirmOutboundInput
): Promise<OutboundConfirmResult> {
  const { id, remark, operatorId, operatorName, t } = input;
  const deductionDetails: DbRow[] = [];

  const [orderRows] = await conn.execute(
    `SELECT id, order_no, status, warehouse_id, warehouse_code, warehouse_name, version
     FROM inv_outbound_order WHERE id = ? AND deleted = 0 FOR UPDATE`,
    [id]
  );

  if (!orderRows || orderRows.length === 0) {
    throw new Error(t('k_uhw8cc'));
  }

  const orderRow = orderRows[0];

  if (!WarehouseStateMachine.canConfirmOutbound(orderRow.status as OutboundStatus)) {
    throw new Error(
      `BAD_REQUEST:当前状态【${WarehouseStateMachine.getOutboundStatusLabel(orderRow.status as OutboundStatus)}】不允许确认`
    );
  }

  const [itemRows] = await conn.execute(
    `SELECT id, material_id, material_name, batch_no, quantity, unit
     FROM inv_outbound_item WHERE order_id = ? AND deleted = 0`,
    [id]
  );

  if (!itemRows || itemRows.length === 0) {
    throw new Error(t('k_xb93o0'));
  }

  for (const item of itemRows) {
    const requiredQty = parseFloat(String(item.quantity));
    logger.debug(
      `[OUTBOUND] Processing item: id=${item.id}, material_id=${item.material_id}, material_name=${item.material_name}, qty=${requiredQty}, batch_no=${item.batch_no}`
    );

    if (item.batch_no) {
      logger.debug(`[OUTBOUND] Using specified batch deduction for item ${item.id}, batch_no=${item.batch_no}`);
      const { deductionDetail } = await executeSpecifiedBatchDeduction(conn, {
        batchNo: String(item.batch_no),
        materialId: Number(item.material_id),
        materialCode: '',
        materialName: String(item.material_name),
        warehouseId: Number(orderRow.warehouse_id),
        warehouseCode: String(orderRow.warehouse_code),
        requiredQty,
        sourceType: 'outbound_order',
        sourceId: Number(id),
        sourceNo: String(orderRow.order_no),
        operatorId: operatorId || null,
        operatorName: operatorName || null,
      });
      deductionDetails.push(deductionDetail);
      logger.debug(
        `[OUTBOUND] Specified batch deduction completed - batch_no=${item.batch_no}, deducted_qty=${deductionDetail.deducted_qty}`
      );
    } else {
      logger.debug(`[OUTBOUND] Using FIFO allocation for item ${item.id}, material_id=${item.material_id}, requiredQty=${requiredQty}`);

      // 宽度感知 FIFO 横切：长度类物料按需求宽度优先精确匹配，否则横切更宽母卷
      const [matRows] = await conn.execute(
        `SELECT width FROM inv_material WHERE id = ? AND deleted = 0`,
        [Number(item.material_id)]
      );
      const matRow = (matRows && matRows[0]) || null;
      const itemWidth = parseFloat(String(item.width)) || 0;
      const materialWidth = matRow ? parseFloat(String(matRow.width)) || 0 : 0;
      // 尺寸类判定：物料有标称宽度即可（长度取自批次，按需横切时再取母批 length）
      const dimensional = materialWidth > 0;
      const requiredWidth = itemWidth > 0 ? itemWidth : materialWidth;

      if (dimensional && requiredWidth > 0) {
        logger.debug(`[OUTBOUND] Width-aware allocation (dimensional) - requiredWidth=${requiredWidth}`);
        const plan = await planWidthSlitAllocation(
          conn,
          Number(item.material_id),
          Number(orderRow.warehouse_id),
          requiredQty,
          requiredWidth
        );
        if (plan.shortage > 0) {
          throw new Error(
            `物料 ${item.material_name} 库存不足(按宽度${requiredWidth}mm): 需要 ${requiredQty}, 可产出 ${plan.total_available}, 缺少 ${plan.shortage}`
          );
        }
        const { deductionDetails: slitDetails } = await executeWidthSlitDeduction(conn, plan, {
          sourceType: 'outbound_order',
          sourceId: Number(id),
          sourceNo: String(orderRow.order_no),
          warehouseId: Number(orderRow.warehouse_id),
          warehouseCode: String(orderRow.warehouse_code),
          operatorId: operatorId || null,
          operatorName: operatorName || null,
        });
        deductionDetails.push(...slitDetails);
        const batchNos = plan.allocations.map((a) => String(a.batch_no)).join(',');
        const batchIds = plan.allocations.map((a) => String(a.batch_id)).join(',');
        const inboundDates = plan.allocations
          .map((a) => String(a.original_inbound_date || a.inbound_date || null))
          .join(',');
        await conn.execute(
          `UPDATE inv_outbound_item SET batch_no = ?, batch_id = ?, original_inbound_date = ? WHERE id = ?`,
          [batchNos, batchIds, inboundDates, item.id]
        );
        logger.debug(`[OUTBOUND] Width-slit deduction completed - ${slitDetails.length} allocations`);
      } else {
        const allocation = await allocateFIFO(
          conn,
          Number(item.material_id),
          Number(orderRow.warehouse_id),
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

        logger.debug(`[OUTBOUND] Executing FIFO deduction with ${allocation.allocations.length} allocations`);
        const { deductionDetails: fifoDetails } = await executeFIFODeductionWithRetry(conn, allocation, {
          sourceType: 'outbound_order',
          sourceId: Number(id),
          sourceNo: String(orderRow.order_no),
          warehouseId: Number(orderRow.warehouse_id),
          warehouseCode: String(orderRow.warehouse_code),
          operatorId: operatorId || null,
          operatorName: operatorName || null,
        });

        deductionDetails.push(...fifoDetails);
        logger.debug(`[OUTBOUND] FIFO deduction completed - ${fifoDetails.length} batches deducted`);

        const batchNos = allocation.allocations.map((a) => String(a.batch_no)).join(',');
        const batchIds = allocation.allocations.map((a) => String(a.batch_id)).join(',');
        const inboundDates = allocation.allocations.map((a) => String(a.inbound_date || null)).join(',');
        await conn.execute(
          `UPDATE inv_outbound_item SET batch_no = ?, batch_id = ?, original_inbound_date = ? WHERE id = ?`,
          [batchNos, batchIds, inboundDates, item.id]
        );
        logger.debug(`[OUTBOUND] Updated item ${item.id} with batch_no: ${batchNos}`);
      }
    }

    // 财务级库存流水（与扣减同事务，任一步失败整体回滚）
    await appendInventoryTransaction(conn, {
      transType: 'out',
      sourceType: 'outbound_order',
      sourceId: Number(orderRow.id),
      sourceLineId: Number(item.id),
      materialId: Number(item.material_id),
      batchNo: item.batch_no ? String(item.batch_no) : null,
      warehouseId: Number(orderRow.warehouse_id),
      quantity: requiredQty,
      locationId: item.location_id ? Number(item.location_id) : null,
      referenceNo: String(orderRow.order_no),
      remark: `销售出库扣减: ${item.material_name}`,
      createBy: operatorId || null,
    });
    // 汇总表由批次明细派生重算，杜绝双写漂移（与 outbound/fifo 一致）
    await recomputeInventorySummary(conn, Number(item.material_id), Number(orderRow.warehouse_id));
  }

  const [orderUpdateResult] = await conn.execute<DbResultSetHeader>(
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
    throw new Error(t('k_166xnaj'));
  }

  // 自动生成应收单（如果出库单关联了客户）
  const [orderInfo] = await conn.execute(
    `SELECT customer_id, customer_name, total_amount, sales_order_id, sales_order_no, outbound_type
       FROM inv_outbound_order WHERE id = ?`,
    [id]
  );

  if (orderInfo && orderInfo.length > 0 && orderInfo[0].customer_id) {
    const customer = orderInfo[0];
    const receivableNo = 'AR' + Date.now();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 默认30天账期

    await conn.execute(
      `INSERT INTO fin_receivable (
        receivable_no, customer_id, customer_name, amount, received_amount,
        status, source_type, source_no, source_id, order_id, order_type,
        due_date, remark, create_time, update_time, deleted
      ) VALUES (?, ?, ?, ?, 0, 1, 1, ?, ?, ?, 'sales', ?, ?, NOW(), NOW(), 0)`,
      [
        receivableNo,
        customer.customer_id,
        customer.customer_name,
        customer.total_amount || 0,
        orderRow.order_no,
        id,
        customer.sales_order_id ?? null,
        dueDate.toISOString().split('T')[0],
        `销售出库自动生成 - ${orderRow.order_no}`,
      ]
    );
  }

  // === 销售出库进度回写 sal_order ===
  // 仅 sales 类型出库单且关联了 sales_order_no 才回写
  // 幂等：累计所有已 completed 的出库单 total_qty，重复确认不重算
  const salesOrderNo = orderInfo?.[0]?.sales_order_no;
  const outboundType = orderInfo?.[0]?.outbound_type;

  if (outboundType === 'sales' && salesOrderNo) {
    // FOR UPDATE 锁行防止并发出库
    const [soRows] = await conn.execute(
      `SELECT id, status FROM sal_order WHERE order_no = ? AND deleted = 0 FOR UPDATE`,
      [salesOrderNo]
    );

    if (soRows.length > 0) {
      const saleOrder = soRows[0];

      // 累计所有已完成出库单的出库数量（幂等，不重复计数）
      const [agg] = await conn.execute(
        `SELECT COALESCE(SUM(io.total_qty), 0) AS shipped_qty
             FROM inv_outbound_order io
             WHERE io.sales_order_no = ?
               AND io.outbound_type = 'sales'
               AND io.status = 'completed'
               AND io.deleted = 0`,
        [salesOrderNo]
      );

      const newShippedQty = parseFloat(String(agg[0].shipped_qty));

      // 订单明细总数（用于判断发货状态）
      const [itemSum] = await conn.execute(
        `SELECT COALESCE(SUM(quantity), 0) AS total_qty
             FROM sal_order_item WHERE order_id = ? AND deleted = 0`,
        [saleOrder.id]
      );

      const orderTotalQty = parseFloat(String(itemSum[0].total_qty));

      // 状态判定：已完成 > 已取消 优先保持终态不变
      let newStatus = saleOrder.status;
      let deliveryDateExpr = '';

      if (saleOrder.status === 1 || saleOrder.status === 2 || saleOrder.status === 3) {
        if (newShippedQty >= orderTotalQty && orderTotalQty > 0) {
          newStatus = 4; // COMPLETED
          deliveryDateExpr = ', actual_delivery_date = NOW()';
        } else if (newShippedQty > 0) {
          newStatus = 3; // PARTIALLY_SHIPPED
        }
        // shipped_qty = 0 → 保持原状态
      }
      // status=4(completed) 或 5(cancelled) → 不动

      await conn.execute(
        `UPDATE sal_order
             SET shipped_qty = ?, status = ?, update_time = NOW()${deliveryDateExpr}
             WHERE id = ?`,
        [newShippedQty, newStatus, saleOrder.id]
      );

      logger.info(
        `[OUTBOUND] sal_order shipped_qty updated — sales_order_no=${salesOrderNo}, ` +
          `shipped_qty=${newShippedQty}, order_total=${orderTotalQty}, new_status=${newStatus}`
      );
    } else {
      logger.warn(
        `[OUTBOUND] sales_order_no=${salesOrderNo} not found in sal_order — shipped_qty not updated`
      );
    }
  }

  return { deductionDetails };
}

/**
 * 撤销出库（核心编排，运行于事务内，conn 复用外层事务）。
 *
 * 流程：锁定订单 → 校验可撤销状态 → 逐明细恢复库存（优先按分配明细精确回滚，
 * 否则按批次恢复）→ 逐明细写反向流水 + 重算汇总 → 订单置 pending。
 */
export async function cancelOutboundTx(
  conn: DbConnection,
  input: CancelOutboundInput
): Promise<OutboundCancelResult> {
  const { id, remark, operatorId, operatorName, t } = input;

  const [orderRows] = await conn.execute(
    `SELECT id, order_no, status, warehouse_id, version
     FROM inv_outbound_order WHERE id = ? AND deleted = 0 FOR UPDATE`,
    [id]
  );

  if (!orderRows || orderRows.length === 0) {
    throw new Error(t('k_uhw8cc'));
  }

  const order = orderRows[0];
  const orderNo = String(order.order_no);

  if (!WarehouseStateMachine.canTransitionOutbound(order.status as OutboundStatus, 'pending')) {
    throw new Error(
      `BAD_REQUEST:${WarehouseStateMachine.getTransitionError('outbound', order.status as OutboundStatus, 'pending')}`
    );
  }

  const [itemRows] = await conn.execute(
    `SELECT material_id, batch_no, quantity FROM inv_outbound_item WHERE order_id = ? AND deleted = 0`,
    [id]
  );

  for (const item of itemRows || []) {
    const batchNos = item.batch_no
      ? String(item.batch_no)
          .split(',')
          .map((b: string) => b.trim())
          .filter(Boolean)
      : [];

    // 恢复库存的 SQL 统一走这里：quantity/available_qty 加回，同时按面积守恒重算 area
    // ⚠️ MySQL 的 UPDATE ... SET 左到右求值：area 放在 quantity 之后时，
    // 语句里的 quantity 已是新值，直接乘即可；写成 (quantity + ?) 会重复加一次。
    const restoreBatch = async (batchNo: string, qty: number) => {
      const [r] = await conn.execute<DbResultSetHeader>(
        `UPDATE inv_inventory_batch SET
          quantity = quantity + ?,
          available_qty = available_qty + ?,
          area = COALESCE(width,0) * COALESCE(length,0) * quantity,
          available_area = COALESCE(width,0) * COALESCE(length,0) * available_qty,
          version = version + 1,
          update_time = NOW()
        WHERE batch_no = ? AND material_id = ? AND warehouse_id = ?`,
        [qty, qty, batchNo, Number(item.material_id), Number(order.warehouse_id)]
      );
      return (r?.affectedRows ?? 0) as number;
    };

    // 优先按分配明细精确回滚（不能只在多批次时才查）：
    // 宽度横切场景下 inv_outbound_item.batch_no 只有 1 个母批号，
    // 但需要回滚的是「面积当量」而非出库单上的窄卷数量，走 item.quantity 会把库存加多。
    const [allocations] = await conn.execute(
      `SELECT batch_no, allocated_qty FROM inv_outbound_batch_allocation
       WHERE source_id = ? AND material_id = ? AND source_type = 'outbound_order'
       ORDER BY batch_no`,
      [id, Number(item.material_id)]
    );

    if (allocations && allocations.length > 0) {
      for (const alloc of allocations) {
        await restoreBatch(String(alloc.batch_no), parseFloat(String(alloc.allocated_qty)));
      }
      // 回滚后删除分配明细，避免二次确认/撤销时重复回滚
      await conn.execute(
        `DELETE FROM inv_outbound_batch_allocation
         WHERE source_id = ? AND material_id = ? AND source_type = 'outbound_order'`,
        [id, Number(item.material_id)]
      );
    } else if (batchNos.length <= 1) {
      const affected = await restoreBatch(String(item.batch_no ?? ''), Number(item.quantity ?? 0));
      if (affected === 0) {
        throw new Error(`库存恢复失败，可能已被其他操作修改: ${item.batch_no}`);
      }
    } else {
      const qtyPerBatch = Number(item.quantity ?? 0) / batchNos.length;
      for (const bNo of batchNos) {
        await restoreBatch(bNo, qtyPerBatch);
      }
    }

    // 财务级库存流水（撤销=反向流水，与恢复同事务）
    await appendInventoryTransaction(conn, {
      transType: 'return',
      sourceType: 'outbound_order',
      sourceId: Number(order.id),
      materialId: Number(item.material_id),
      batchNo: item.batch_no ? String(item.batch_no) : null,
      warehouseId: Number(order.warehouse_id),
      quantity: parseFloat(String(item.quantity)),
      referenceNo: String(order.order_no),
      remark: `撤销出库: ${remark || ''}`,
      createBy: operatorId || null,
    });
    // 汇总表由批次明细派生重算，杜绝双写漂移
    await recomputeInventorySummary(conn, Number(item.material_id), Number(order.warehouse_id));
  }

  await conn.execute(
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

  return { orderNo };
}
