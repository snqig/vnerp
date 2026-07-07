import { query, execute, transaction } from './db';
import Decimal from 'decimal.js';

export interface FIFOAllocationItem {
  batch_id: number;
  batch_no: string;
  material_id: number;
  material_code: string;
  material_name: string;
  allocate_qty: number;
  available_qty_before: number;
  unit_cost: number;
  inbound_date: string;
  expire_date?: string;
  opened_at?: string;
  version?: number;
}

export interface FIFOAllocationResult {
  material_id: number;
  material_code: string;
  material_name: string;
  required_qty: number;
  total_available: number;
  allocated_qty: number;
  shortage: number;
  shortage_percentage: number;
  allocations: FIFOAllocationItem[];
}

export interface ShortageWarning {
  materialId: number;
  materialCode: string;
  materialName: string;
  requiredQty: number;
  availableQty: number;
  shortageQty: number;
  shortagePercentage: number;
  safetyStock?: number;
  reorderPoint?: number;
  reorderSuggestion?: number;
}

export interface AllocationWithRetry {
  success: boolean;
  attempts: number;
  result?: FIFOAllocationResult;
  error?: string;
}

export const DEFAULT_RETRY_ATTEMPTS = 3;
export const DEFAULT_RETRY_DELAY_MS = 100;

export async function allocateFIFO(
  conn: any,
  materialId: number,
  warehouseId: number,
  requiredQty: number,
  options?: {
    allowExpired?: boolean;
    excludeBatchIds?: number[];
  }
): Promise<FIFOAllocationResult> {
  const allowExpired = options?.allowExpired ?? false;
  const excludeBatchIds = options?.excludeBatchIds ?? [];

  let sql = `SELECT
      id, batch_no, material_id, material_code, material_name,
      available_qty, unit_price, inbound_date, unit, expire_date, opened_at, version
    FROM inv_inventory_batch
    WHERE material_id = ? AND warehouse_id = ? AND available_qty > 0 AND deleted = 0 AND status = 1`;

  if (!allowExpired) {
    sql += ` AND (expire_date IS NULL OR expire_date >= CURDATE())`;
  }

  if (excludeBatchIds.length > 0) {
    sql += ` AND id NOT IN (${excludeBatchIds.join(',')})`;
  }

  sql += ` ORDER BY
      CASE WHEN opened_at IS NOT NULL THEN opened_at ELSE inbound_date END ASC,
      expire_date ASC,
      inbound_date ASC,
      id ASC
    FOR UPDATE`;

  const [batches]: any = await conn.query(sql, [materialId, warehouseId]);

  const result: FIFOAllocationResult = {
    material_id: materialId,
    material_code: batches.length > 0 ? batches[0].material_code : '',
    material_name: batches.length > 0 ? batches[0].material_name : '',
    required_qty: requiredQty,
    total_available: 0,
    allocated_qty: 0,
    shortage: 0,
    shortage_percentage: 0,
    allocations: [],
  };

  const totalAvailableDecimal = batches.reduce(
    (sum: Decimal, b: any) => sum.plus(new Decimal(b.available_qty)),
    new Decimal(0)
  );
  result.total_available = totalAvailableDecimal.toNumber();

  let remainingDecimal = new Decimal(requiredQty);

  for (const batch of batches) {
    if (remainingDecimal.lessThanOrEqualTo(0)) break;

    const availableQtyDecimal = new Decimal(batch.available_qty);
    const allocateQtyDecimal = Decimal.min(remainingDecimal, availableQtyDecimal);

    result.allocations.push({
      batch_id: batch.id,
      batch_no: batch.batch_no,
      material_id: batch.material_id,
      material_code: batch.material_code,
      material_name: batch.material_name,
      allocate_qty: allocateQtyDecimal.toNumber(),
      available_qty_before: availableQtyDecimal.toNumber(),
      unit_cost: new Decimal(batch.unit_price || 0).toNumber(),
      inbound_date: batch.inbound_date,
      expire_date: batch.expire_date,
      opened_at: batch.opened_at,
      version: batch.version,
    });

    remainingDecimal = remainingDecimal.minus(allocateQtyDecimal);
    result.allocated_qty = result.allocated_qty + allocateQtyDecimal.toNumber();
  }

  result.shortage = Decimal.max(remainingDecimal, 0).toNumber();
  result.shortage_percentage =
    requiredQty > 0 ? new Decimal(result.shortage).dividedBy(requiredQty).times(100).toNumber() : 0;

  return result;
}

export async function checkShortageAndWarn(
  materialId: number,
  requiredQty: number
): Promise<ShortageWarning | null> {
  const [safetyRows]: any = await query(
    `SELECT safety_stock, min_stock FROM inv_material WHERE id = ? AND deleted = 0`,
    [materialId]
  );

  if (!safetyRows || safetyRows.length === 0) return null;

  const { safety_stock, min_stock } = safetyRows[0];
  const reorder_point = min_stock;
  const safetyStock = parseFloat(safety_stock) || 0;
  const reorderPoint = parseFloat(reorder_point) || 0;

  const [invRows]: any = await query(
    `SELECT COALESCE(SUM(available_qty), 0) as total_available FROM inv_inventory_batch
     WHERE material_id = ? AND deleted = 0 AND status = 1`,
    [materialId]
  );

  const availableQty = parseFloat(invRows[0]?.total_available) || 0;
  const shortageQty = Math.max(0, requiredQty - availableQty);

  if (shortageQty === 0) return null;

  const reorderSuggestion = Math.max(0, reorderPoint - availableQty + requiredQty);

  return {
    materialId,
    materialCode: '',
    materialName: '',
    requiredQty,
    availableQty,
    shortageQty,
    shortagePercentage: requiredQty > 0 ? (shortageQty / requiredQty) * 100 : 0,
    safetyStock,
    reorderPoint,
    reorderSuggestion,
  };
}

export async function executeFIFODeductionWithRetry(
  conn: any,
  allocation: FIFOAllocationResult,
  params: {
    sourceType: string;
    sourceId: number;
    sourceNo: string;
    warehouseId: number;
    warehouseCode: string;
    operatorId: number | null;
    operatorName: string | null;
  },
  maxRetries: number = DEFAULT_RETRY_ATTEMPTS
): Promise<{ deductionDetails: any[]; totalCost: number; attempts: number }> {
  let attempts = 0;
  let lastError: string = '';

  while (attempts < maxRetries) {
    attempts++;
    try {
      const result = await executeFIFODeductionInternal(conn, allocation, params);
      return { ...result, attempts };
    } catch (error: any) {
      lastError = error.message;
      if (
        attempts < maxRetries &&
        (lastError.includes('已被其他操作修改') ||
          lastError.includes('version') ||
          lastError.includes('affectedRows'))
      ) {
        await new Promise((resolve) => setTimeout(resolve, DEFAULT_RETRY_DELAY_MS * attempts));
        continue;
      }
      throw error;
    }
  }

  throw new Error(`FIFO deduction failed after ${maxRetries} attempts: ${lastError}`);
}

async function executeFIFODeductionInternal(
  conn: any,
  allocation: FIFOAllocationResult,
  params: {
    sourceType: string;
    sourceId: number;
    sourceNo: string;
    warehouseId: number;
    warehouseCode: string;
    operatorId: number | null;
    operatorName: string | null;
  }
): Promise<{ deductionDetails: any[]; totalCost: number }> {
  const deductionDetails: any[] = [];
  const totalCostDecimal = new Decimal(0);

  for (const alloc of allocation.allocations) {
    const [updateResult]: any = await conn.execute(
      `UPDATE inv_inventory_batch SET
        quantity = quantity - ?,
        available_qty = available_qty - ?,
        version = version + 1,
        update_time = NOW()
      WHERE id = ? AND available_qty >= ? AND version = ?`,
      [alloc.allocate_qty, alloc.allocate_qty, alloc.batch_id, alloc.allocate_qty, alloc.version]
    );

    if (updateResult.affectedRows === 0) {
      const [currentBatch]: any = await conn.query(
        'SELECT version, available_qty FROM inv_inventory_batch WHERE id = ?',
        [alloc.batch_id]
      );
      if (currentBatch.length > 0) {
        throw new Error(
          `批次${alloc.batch_no}乐观锁冲突: 期望版本${alloc.version}, ` +
            `实际版本${currentBatch[0].version}, 可用量${currentBatch[0].available_qty}`
        );
      }
      throw new Error(`FIFO库存更新失败: 批次${alloc.batch_no}，可能已被其他操作修改`);
    }

    const lineCostDecimal = new Decimal(alloc.allocate_qty).times(alloc.unit_cost);
    totalCostDecimal.plus(lineCostDecimal);

    deductionDetails.push({
      batch_id: alloc.batch_id,
      batch_no: alloc.batch_no,
      material_id: alloc.material_id,
      material_name: alloc.material_name,
      deducted_qty: alloc.allocate_qty,
      unit_cost: alloc.unit_cost,
      line_cost: lineCostDecimal.toNumber(),
      mode: 'fifo_auto',
    });

    const [currentInv]: any = await conn.query(
      'SELECT quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0',
      [alloc.material_id, params.warehouseId]
    );
    const beforeQty = currentInv.length > 0 ? parseFloat(currentInv[0].quantity) : 0;
    const afterQty = beforeQty - alloc.allocate_qty;

    await conn.execute(
      `INSERT INTO inv_inventory_log (
        material_id, warehouse_id, batch_no, operation_type, operation_qty,
        before_qty, after_qty, business_type, business_no, remark, operator_id, create_time
      ) VALUES (?, ?, ?, 2, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        alloc.material_id,
        params.warehouseId,
        alloc.batch_no,
        alloc.allocate_qty,
        beforeQty,
        afterQty,
        params.sourceType,
        params.sourceNo,
        `FIFO出库-批次${alloc.batch_no}`,
        params.operatorId,
      ]
    );
  }

  return { deductionDetails, totalCost: totalCostDecimal.toNumber() };
}

export async function executeFIFOWithTransaction(
  allocations: Array<{
    materialId: number;
    warehouseId: number;
    requiredQty: number;
    excludeBatchIds?: number[];
  }>,
  params: {
    sourceType: string;
    sourceId: number;
    sourceNo: string;
    warehouseCode: string;
    operatorId: number | null;
    operatorName: string | null;
  }
): Promise<{
  results: FIFOAllocationResult[];
  totalCost: number;
  shortageWarnings: ShortageWarning[];
  success: boolean;
  error?: string;
}> {
  const results: FIFOAllocationResult[] = [];
  const shortageWarnings: ShortageWarning[] = [];
  let totalCostDecimal = new Decimal(0);

  try {
    const finalResult = await transaction(async (conn) => {
      for (const alloc of allocations) {
        const allocation = await allocateFIFO(
          conn,
          alloc.materialId,
          alloc.warehouseId,
          alloc.requiredQty,
          {
            excludeBatchIds: alloc.excludeBatchIds,
          }
        );

        if (allocation.shortage > 0) {
          const warning = await checkShortageAndWarn(alloc.materialId, alloc.requiredQty);
          if (warning) {
            warning.materialCode = allocation.material_code;
            warning.materialName = allocation.material_name;
            shortageWarnings.push(warning);
          }
        }

        if (allocation.allocations.length > 0) {
          const deductionResult = await executeFIFODeductionWithRetry(conn, allocation, {
            sourceType: params.sourceType,
            sourceId: params.sourceId,
            sourceNo: params.sourceNo,
            warehouseId: alloc.warehouseId,
            warehouseCode: params.warehouseCode,
            operatorId: params.operatorId,
            operatorName: params.operatorName,
          });
          totalCostDecimal = totalCostDecimal.plus(deductionResult.totalCost);
        }

        results.push(allocation);
      }

      return {
        results,
        totalCost: totalCostDecimal.toNumber(),
        shortageWarnings,
        success: true,
      };
    });

    return finalResult;
  } catch (error: any) {
    return {
      results,
      totalCost: totalCostDecimal.toNumber(),
      shortageWarnings,
      success: false,
      error: error.message,
    };
  }
}

export async function executeSpecifiedBatchDeduction(
  conn: any,
  params: {
    batchNo: string;
    materialId: number;
    materialCode: string;
    materialName: string;
    warehouseId: number;
    warehouseCode: string;
    requiredQty: number;
    sourceType: string;
    sourceId: number;
    sourceNo: string;
    operatorId: number | null;
    operatorName: string | null;
  }
): Promise<{ deductionDetail: any; totalCost: number }> {
  const [batch]: any = await conn.query(
    `SELECT id, batch_no, available_qty, quantity, unit_price, version FROM inv_inventory_batch
     WHERE batch_no = ? AND material_id = ? AND warehouse_id = ? AND deleted = 0
     FOR UPDATE`,
    [params.batchNo, params.materialId, params.warehouseId]
  );

  if (batch.length === 0) {
    throw new Error(`库存批次不存在: ${params.batchNo}`);
  }

  const batchData = batch[0];
  const availableQtyDecimal = new Decimal(batchData.available_qty);
  const requiredQtyDecimal = new Decimal(params.requiredQty);

  if (availableQtyDecimal.lessThan(requiredQtyDecimal)) {
    throw new Error(
      `库存不足: ${params.materialName}(${params.batchNo}), ` +
        `可用: ${availableQtyDecimal.toFixed(2)}, 需要: ${requiredQtyDecimal.toFixed(2)}`
    );
  }

  const [updateResult]: any = await conn.execute(
    `UPDATE inv_inventory_batch SET
      quantity = quantity - ?,
      available_qty = available_qty - ?,
      version = version + 1,
      update_time = NOW()
    WHERE id = ? AND version = ?`,
    [params.requiredQty, params.requiredQty, batchData.id, batchData.version]
  );

  if (updateResult.affectedRows === 0) {
    throw new Error(`库存更新失败，可能已被其他操作修改: ${params.batchNo}`);
  }

  const unitCostDecimal = new Decimal(batchData.unit_price || 0);
  const totalCostDecimal = requiredQtyDecimal.times(unitCostDecimal);

  const [currentInv]: any = await conn.query(
    'SELECT quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0',
    [params.materialId, params.warehouseId]
  );
  const beforeQty = currentInv.length > 0 ? parseFloat(currentInv[0].quantity) : 0;
  const afterQty = beforeQty - params.requiredQty;

  await conn.execute(
    `INSERT INTO inv_inventory_log (
      material_id, warehouse_id, batch_no, operation_type, operation_qty,
      before_qty, after_qty, business_type, business_no, remark, operator_id, create_time
    ) VALUES (?, ?, ?, 2, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      params.materialId,
      params.warehouseId,
      params.batchNo,
      params.requiredQty,
      beforeQty,
      afterQty,
      params.sourceType,
      params.sourceNo,
      `指定批次出库-${params.batchNo}`,
      params.operatorId,
    ]
  );

  return {
    deductionDetail: {
      batch_id: batchData.id,
      batch_no: params.batchNo,
      material_id: params.materialId,
      material_name: params.materialName,
      deducted_qty: params.requiredQty,
      unit_cost: unitCostDecimal.toNumber(),
      line_cost: totalCostDecimal.toNumber(),
      mode: 'specified_batch',
    },
    totalCost: totalCostDecimal.toNumber(),
  };
}
