/**
 * 出库确认服务
 * 从 outbound/confirm/route.ts 拆分，封装批次分配、库存扣减、应收生成逻辑
 */
import type { PoolConnection } from 'mysql2/promise';
import type { DbConnection, DbRow } from '@/types/db';
import { appendInventoryTransaction, recomputeInventorySummary } from '@/lib/inventory-ledger';
import {
  allocateFIFO,
  executeFIFODeductionWithRetry,
  executeSpecifiedBatchDeduction,
} from '@/lib/fifo-allocation';
import { planWidthSlitAllocation, executeWidthSlitDeduction } from '@/lib/fifo-width-slit';
import { logger } from '@/lib/logger';

export interface ConfirmItem {
  id: number;
  material_id: number;
  material_name: string;
  batch_no?: string;
  quantity: number;
  unit: string;
  width?: number;
}

export interface ConfirmContext {
  orderId: number;
  orderNo: string;
  warehouseId: number;
  warehouseCode: string;
  operatorId?: number;
  operatorName?: string;
  remark?: string;
}

export interface DeductionDetail {
  materialId: number;
  batchNo: string;
  deductedQty: number;
  unitPrice: number;
}

/**
 * 确认出库：对订单明细逐项执行批次分配和库存扣减
 */
export async function confirmOutboundItems(
  conn: PoolConnection,
  items: ConfirmItem[],
  ctx: ConfirmContext
): Promise<DeductionDetail[]> {
  const deductionDetails: DeductionDetail[] = [];
  // 事务连接（mysql2 PoolConnection）与 DbConnection 结构兼容，统一视图供 FIFO 引擎调用
  const dbConn = conn as unknown as DbConnection;

  for (const item of items) {
    const requiredQty = Number(item.quantity);
    logger.debug(`[OUTBOUND] Processing item: material=${item.material_id}, qty=${requiredQty}, batch=${item.batch_no}`);

    if (item.batch_no) {
      // 指定批次扣减
      const { deductionDetail } = await executeSpecifiedBatchDeduction(dbConn, {
        batchNo: item.batch_no,
        materialId: item.material_id,
        materialCode: '',
        materialName: item.material_name,
        warehouseId: ctx.warehouseId,
        warehouseCode: ctx.warehouseCode,
        requiredQty,
        sourceType: 'outbound_order',
        sourceId: ctx.orderId,
        sourceNo: ctx.orderNo,
        operatorId: ctx.operatorId || null,
        operatorName: ctx.operatorName || null,
      });
      deductionDetails.push(deductionDetail as unknown as DeductionDetail);
    } else {
      // 宽度感知 FIFO 横切（印刷行业特性）
      const [matRows] = await conn.execute(
        'SELECT width FROM inv_material WHERE id = ? AND deleted = 0',
        [item.material_id]
      );
      const matRow = (matRows as DbRow[])[0];
      const itemWidth = Number(item.width) || 0;
      const materialWidth = matRow ? Number(matRow.width) || 0 : 0;
      const dimensional = materialWidth > 0;
      const requiredWidth = itemWidth > 0 ? itemWidth : materialWidth;

      if (dimensional && requiredWidth > 0) {
        // 宽度横切分配
        const plan = await planWidthSlitAllocation(
          dbConn,
          item.material_id,
          ctx.warehouseId,
          requiredQty,
          requiredWidth
        );
        if (plan.shortage > 0) {
          throw new Error(
            `物料 ${item.material_name} 库存不足(按宽度${requiredWidth}mm): 需要 ${requiredQty}, 可产出 ${plan.total_available}, 缺少 ${plan.shortage}`
          );
        }
        const { deductionDetails: slitDetails } = await executeWidthSlitDeduction(dbConn, plan, {
          sourceType: 'outbound_order',
          sourceId: ctx.orderId,
          sourceNo: ctx.orderNo,
          warehouseId: ctx.warehouseId,
          warehouseCode: ctx.warehouseCode,
          operatorId: ctx.operatorId || null,
          operatorName: ctx.operatorName || null,
        });
        deductionDetails.push(...slitDetails as unknown as DeductionDetail[]);

        // 回写批次信息到出库明细
        const allocRows = plan.allocations as unknown as DbRow[];
        const batchNos = allocRows.map((a: DbRow) => a.batch_no).join(',');
        const batchIds = allocRows.map((a: DbRow) => a.batch_id).join(',');
        const inboundDates = allocRows
          .map((a: DbRow) => a.original_inbound_date || a.inbound_date || null)
          .join(',');
        await conn.execute(
          'UPDATE inv_outbound_item SET batch_no = ?, batch_id = ?, original_inbound_date = ? WHERE id = ?',
          [batchNos, batchIds, inboundDates, item.id]
        );
      } else {
        // 普通 FIFO 分配
        const allocation = await allocateFIFO(dbConn, item.material_id, ctx.warehouseId, requiredQty);
        if (allocation.shortage > 0) {
          throw new Error(
            `物料 ${item.material_name} 库存不足: 需要 ${requiredQty}, 可用 ${allocation.total_available}, 缺少 ${allocation.shortage}`
          );
        }
        const { deductionDetails: fifoDetails } = await executeFIFODeductionWithRetry(dbConn, allocation, {
          sourceType: 'outbound_order',
          sourceId: ctx.orderId,
          sourceNo: ctx.orderNo,
          warehouseId: ctx.warehouseId,
          warehouseCode: ctx.warehouseCode,
          operatorId: ctx.operatorId || null,
          operatorName: ctx.operatorName || null,
        });
        deductionDetails.push(...fifoDetails as unknown as DeductionDetail[]);

        // 回写批次信息到出库明细
        const batchNos = allocation.allocations.map((a) => a.batch_no).join(',');
        const batchIds = allocation.allocations.map((a) => a.batch_id).join(',');
        const inboundDates = allocation.allocations.map((a) => a.inbound_date || null).join(',');
        await conn.execute(
          'UPDATE inv_outbound_item SET batch_no = ?, batch_id = ?, original_inbound_date = ? WHERE id = ?',
          [batchNos, batchIds, inboundDates, item.id]
        );
      }
    }

    // 记录库存流水
    await appendInventoryTransaction(dbConn, {
      transType: 'out',
      sourceType: 'outbound_order',
      sourceId: ctx.orderId,
      sourceLineId: item.id,
      materialId: item.material_id,
      batchNo: item.batch_no || null,
      warehouseId: ctx.warehouseId,
      quantity: requiredQty,
      locationId: null,
      referenceNo: ctx.orderNo,
      remark: `销售出库扣减: ${item.material_name}`,
      createBy: ctx.operatorId || null,
    });

    // 重算汇总表
    await recomputeInventorySummary(dbConn, item.material_id, ctx.warehouseId);
  }

  return deductionDetails;
}

/**
 * 出库确认后自动生成应收单
 */
export async function generateReceivableAfterOutbound(
  conn: PoolConnection,
  orderId: number,
  totalAmount: number
): Promise<void> {
  const [orderInfo] = await conn.execute(
    'SELECT customer_id, customer_name, sales_order_no FROM inv_outbound_order WHERE id = ?',
    [orderId]
  );

  if (!orderInfo || (orderInfo as DbRow[]).length === 0) return;
  const order = (orderInfo as DbRow[])[0];
  if (!order.customer_id) return;

  const receivableNo = 'AR' + Date.now();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  await conn.execute(
    `INSERT INTO fin_receivable (receivable_no, customer_id, customer_name, amount, received_amount, balance, due_date, status, order_id, order_type, create_time)
     VALUES (?, ?, ?, ?, 0, ?, ?, 1, ?, 'sales_outbound', NOW())`,
    [receivableNo, order.customer_id, order.customer_name, totalAmount, totalAmount, dueDate, orderId]
  );
}
