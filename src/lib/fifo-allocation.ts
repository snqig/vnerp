import { query, execute, transaction } from './db';

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
}

export interface FIFOAllocationResult {
  material_id: number;
  material_code: string;
  material_name: string;
  required_qty: number;
  total_available: number;
  allocated_qty: number;
  shortage: number;
  allocations: FIFOAllocationItem[];
}

export interface BatchAllocationRecord {
  source_type: string;
  source_id: number;
  source_no: string;
  warehouse_id: number;
  material_id: number;
  batch_id: number;
  batch_no: string;
  allocated_qty: number;
  unit_cost: number;
  total_cost: number;
  fifo_mode: 'fifo_auto' | 'specified_batch' | 'manual_override';
  operator_id: number | null;
  operator_name: string | null;
}

export async function allocateFIFO(
  conn: any,
  materialId: number,
  warehouseId: number,
  requiredQty: number
): Promise<FIFOAllocationResult> {
  const [batches]: any = await conn.query(
    `SELECT
      id, batch_no, material_id, material_code, material_name,
      available_qty, unit_price, inbound_date, unit, expire_date
    FROM inv_inventory_batch
    WHERE material_id = ? AND warehouse_id = ? AND available_qty > 0 AND deleted = 0 AND status = 'normal'
    ORDER BY
      CASE
        WHEN expire_date IS NOT NULL AND DATEDIFF(expire_date, CURDATE()) <= 30 THEN 0
        WHEN expire_date IS NOT NULL AND DATEDIFF(expire_date, CURDATE()) <= 60 THEN 1
        ELSE 2
      END,
      inbound_date ASC,
      expire_date ASC,
      id ASC
    FOR UPDATE`,
    [materialId, warehouseId]
  );

  const result: FIFOAllocationResult = {
    material_id: materialId,
    material_code: batches.length > 0 ? batches[0].material_code : '',
    material_name: batches.length > 0 ? batches[0].material_name : '',
    required_qty: requiredQty,
    total_available: 0,
    allocated_qty: 0,
    shortage: 0,
    allocations: [],
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
      expire_date: batch.expire_date,
    });

    remaining -= allocateQty;
    result.allocated_qty += allocateQty;
  }

  result.shortage = Math.max(0, remaining);

  return result;
}

export async function executeFIFODeduction(
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
  let totalCost = 0;

  for (const alloc of allocation.allocations) {
    const [updateResult] = await conn.execute(
      `UPDATE inv_inventory_batch SET
        quantity = quantity - ?,
        available_qty = available_qty - ?,
        version = version + 1,
        update_time = NOW()
      WHERE id = ? AND available_qty >= ?`,
      [alloc.allocate_qty, alloc.allocate_qty, alloc.batch_id, alloc.allocate_qty]
    );

    if ((updateResult as any).affectedRows === 0) {
      throw new Error(`FIFO库存更新失败: 批次${alloc.batch_no}，可能已被其他操作修改`);
    }

    const lineCost = alloc.allocate_qty * alloc.unit_cost;
    totalCost += lineCost;

    deductionDetails.push({
      batch_id: alloc.batch_id,
      batch_no: alloc.batch_no,
      material_id: alloc.material_id,
      material_name: alloc.material_name,
      deducted_qty: alloc.allocate_qty,
      unit_cost: alloc.unit_cost,
      line_cost: lineCost,
      mode: 'fifo_auto',
    });

    await conn.execute(
      `INSERT INTO inv_inventory_transaction (
        trans_no, trans_type, batch_no, material_id, material_code, material_name,
        warehouse_id, warehouse_code, quantity, source_type, source_no,
        operated_by, operated_at, remark
      ) VALUES (?, 'outbound', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [
        `OUT${Date.now()}${alloc.batch_id}`,
        alloc.batch_no,
        alloc.material_id,
        alloc.material_code,
        alloc.material_name,
        params.warehouseId,
        params.warehouseCode,
        -alloc.allocate_qty,
        params.sourceType,
        params.sourceNo,
        params.operatorId,
        `FIFO出库-批次${alloc.batch_no}`,
      ]
    );

    try {
      await conn.execute(
        `INSERT INTO inv_outbound_batch_allocation (
          source_type, source_id, source_no, warehouse_id,
          material_id, batch_id, batch_no, allocated_qty, unit_cost, total_cost,
          fifo_mode, operator_id, operator_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'fifo_auto', ?, ?)`,
        [
          params.sourceType,
          params.sourceId,
          params.sourceNo,
          params.warehouseId,
          alloc.material_id,
          alloc.batch_id,
          alloc.batch_no,
          alloc.allocate_qty,
          alloc.unit_cost,
          lineCost,
          params.operatorId,
          params.operatorName,
        ]
      );
    } catch {}
  }

  return { deductionDetails, totalCost };
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
  if (parseFloat(batchData.available_qty) < params.requiredQty) {
    throw new Error(
      `库存不足: ${params.materialName}(${params.batchNo}), ` +
      `可用: ${batchData.available_qty}, 需要: ${params.requiredQty}`
    );
  }

  const [updateResult] = await conn.execute(
    `UPDATE inv_inventory_batch SET
      quantity = quantity - ?,
      available_qty = available_qty - ?,
      version = version + 1,
      update_time = NOW()
    WHERE id = ?`,
    [params.requiredQty, params.requiredQty, batchData.id]
  );

  if ((updateResult as any).affectedRows === 0) {
    throw new Error(`库存更新失败，可能已被其他操作修改: ${params.batchNo}`);
  }

  const unitCost = parseFloat(batchData.unit_price) || 0;
  const totalCost = params.requiredQty * unitCost;

  await conn.execute(
    `INSERT INTO inv_inventory_transaction (
      trans_no, trans_type, batch_no, material_id, material_code, material_name,
      warehouse_id, warehouse_code, quantity, source_type, source_no,
      operated_by, operated_at, remark
    ) VALUES (?, 'outbound', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
    [
      `OUT${Date.now()}${batchData.id}`,
      params.batchNo,
      params.materialId,
      params.materialCode,
      params.materialName,
      params.warehouseId,
      params.warehouseCode,
      -params.requiredQty,
      params.sourceType,
      params.sourceNo,
      params.operatorId,
      `指定批次出库-${params.batchNo}`,
    ]
  );

  try {
    await conn.execute(
      `INSERT INTO inv_outbound_batch_allocation (
        source_type, source_id, source_no, warehouse_id,
        material_id, batch_id, batch_no, allocated_qty, unit_cost, total_cost,
        fifo_mode, operator_id, operator_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'specified_batch', ?, ?)`,
      [
        params.sourceType,
        params.sourceId,
        params.sourceNo,
        params.warehouseId,
        params.materialId,
        batchData.id,
        params.batchNo,
        params.requiredQty,
        unitCost,
        totalCost,
        params.operatorId,
        params.operatorName,
      ]
    );
  } catch {}

  return {
    deductionDetail: {
      batch_id: batchData.id,
      batch_no: params.batchNo,
      material_id: params.materialId,
      material_name: params.materialName,
      deducted_qty: params.requiredQty,
      unit_cost: unitCost,
      line_cost: totalCost,
      mode: 'specified_batch',
    },
    totalCost,
  };
}
