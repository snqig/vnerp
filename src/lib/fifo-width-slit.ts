/**
 * @module 宽度感知 FIFO 横切（长度/尺寸类物料）
 * @description
 *  对 PVC / PE / 不干胶 PET 银色等"宽×长"卷料，按"需求宽度"做先进先出：
 *  1) 优先匹配精确宽度批次（直接扣减）；
 *  2) 若无精确宽度，但存在更宽母卷，则"横切"母卷：生成一条需求宽度的子批(SC)，
 *     母卷按面积当量扣减（面积守恒，卷数可成小数），子批立即被本次出库消耗；
 *  3) 窄于需求宽度的批次无法满足（无法拼宽），跳过。
 *
 *  仅当物料为"尺寸类"(width>0 && length>0) 且 requiredWidth>0 时启用；
 *  否则调用方应走普通 FIFO（本模块不处理）。面积计量依赖 inv_inventory_batch.area
 *  （见迁移 080）与 recomputeInventorySummary 的面积汇总。
 */
import Decimal from 'decimal.js';
import { appendInventoryTransaction, recomputeInventorySummary, appendInventoryLog } from './inventory-ledger';
import type { DbRow, DbResult, DbConnection, DbResultSetHeader } from '@/types/db';

export interface WidthSlitAlloc {
  mode: 'direct' | 'slit';
  batch_id: number;
  batch_no: string;
  material_id: number;
  material_code: string;
  material_name: string;
  width: number; // 母批物理宽度
  length: number; // 母批物理长度
  unit_price: number;
  version: number;
  available_qty: number;
  allocate_qty: number; // 产出的需求宽卷数
  consumed_area: number; // 从母批扣出的面积
  parent_roll_equiv: number; // 折算的母卷当量(可小数)
  child_width: number; // = requiredWidth
  child_length: number; // = 母批长度
  child_batch_no?: string;
}

export interface WidthSlitPlan {
  material_id: number;
  required_qty: number;
  required_width: number;
  is_dimensional: boolean;
  total_available: number; // 可产出需求宽卷总数(估算)
  allocated_qty: number;
  shortage: number;
  allocations: WidthSlitAlloc[];
}

export interface WidthSlitDeductParams {
  sourceType: string;
  sourceId: number;
  sourceNo: string;
  warehouseId: number;
  warehouseCode: string;
  operatorId: number | null;
  operatorName: string | null;
}

const SLIT_FIFO_ORDER = `
  CASE WHEN split_flag = 2 THEN 0 ELSE 1 END ASC,
  CASE WHEN opened_at IS NOT NULL THEN 0 ELSE 1 END ASC,
  expire_date ASC,
  inbound_date ASC,
  id ASC
`;

/** 判断物料是否为"尺寸类"(有标称宽度，长度类卷料)。长度取自批次，按需横切时再取母批 length。 */
export async function isDimensionalMaterial(conn: DbConnection, materialId: number): Promise<boolean> {
  const [rows]: DbResult = await conn.query(
    `SELECT width FROM inv_material WHERE id = ? AND deleted = 0`,
    [materialId]
  );
  if (!rows || rows.length === 0) return false;
  return (parseFloat(String(rows[0].width)) || 0) > 0;
}

/**
 * 只读规划：按需求宽度分配批次（精确匹配优先，否则横切更宽母卷）。
 * 不修改任何数据。
 */
export async function planWidthSlitAllocation(
  conn: DbConnection,
  materialId: number,
  warehouseId: number,
  requiredQty: number,
  requiredWidth: number
): Promise<WidthSlitPlan> {
  const plan: WidthSlitPlan = {
    material_id: materialId,
    required_qty: requiredQty,
    required_width: requiredWidth,
    is_dimensional: true,
    total_available: 0,
    allocated_qty: 0,
    shortage: 0,
    allocations: [],
  };

  // 只取 宽度 >= 需求宽度 的批次；先精确匹配(宽=需求)，再按 FIFO 横切更宽卷
  const [batches]: DbResult = await conn.query(
    `SELECT id, batch_no, material_id, material_code, material_name,
            available_qty, unit_price, width, length, version, inbound_date, split_flag
     FROM inv_inventory_batch
     WHERE material_id = ? AND warehouse_id = ? AND available_qty > 0 AND deleted = 0 AND status = 1
       AND width >= ?
     ORDER BY
       CASE WHEN width = ? THEN 0 ELSE 1 END ASC,
       ${SLIT_FIFO_ORDER}`,
    [materialId, warehouseId, requiredWidth, requiredWidth]
  );

  let remaining = new Decimal(requiredQty);
  for (const b of batches) {
    if (remaining.lessThanOrEqualTo(0)) break;
    const w = new Decimal(parseFloat(String(b.width)) || 0);
    const l = new Decimal(parseFloat(String(b.length)) || 0);
    if (w.lessThanOrEqualTo(0) || l.lessThanOrEqualTo(0)) continue; // 非尺寸类跳过

    const avail = new Decimal(parseFloat(String(b.available_qty)));
    const batchArea = w.times(l).times(avail); // 该批可用面积
    const narrowAreaPerRoll = new Decimal(requiredWidth).times(l); // 一条需求宽卷面积
    if (narrowAreaPerRoll.lessThanOrEqualTo(0)) continue;

    // 该批最多可产出的需求宽卷数（面积 / 单条面积），向下取整
    const maxNarrow = batchArea.div(narrowAreaPerRoll).floor();
    const alloc = Decimal.min(remaining, maxNarrow);
    if (alloc.lessThanOrEqualTo(0)) continue;

    const consumedArea = narrowAreaPerRoll.times(alloc);
    const parentRollEquiv = consumedArea.div(w.times(l)); // 占母卷当量

    const exact = w.toNumber() === requiredWidth;
    plan.allocations.push({
      mode: exact ? 'direct' : 'slit',
      batch_id: Number(b.id),
      batch_no: String(b.batch_no),
      material_id: Number(b.material_id),
      material_code: String(b.material_code),
      material_name: String(b.material_name),
      width: w.toNumber(),
      length: l.toNumber(),
      unit_price: parseFloat(String(b.unit_price)) || 0,
      version: Number(b.version),
      available_qty: avail.toNumber(),
      allocate_qty: alloc.toNumber(),
      consumed_area: consumedArea.toNumber(),
      parent_roll_equiv: parentRollEquiv.toNumber(),
      child_width: requiredWidth,
      child_length: l.toNumber(),
    });
    plan.allocated_qty += alloc.toNumber();
    plan.total_available += maxNarrow.toNumber();
    remaining = remaining.minus(alloc);
  }

  plan.shortage = remaining.greaterThan(0) ? remaining.toNumber() : 0;
  return plan;
}

/** 库存流水日志（与既有 FIFO 引擎同一 inv_inventory_log 形态）。 */
async function invLog(
  conn: DbConnection,
  materialId: number,
  warehouseId: number,
  batchNo: string,
  opType: number,
  qty: number,
  bizNo: string,
  remark: string,
  operatorId: number | null
): Promise<void> {
  await appendInventoryLog(conn, {
    materialId,
    warehouseId,
    batchNo,
    operationType: opType,
    operationQty: qty,
    beforeQty: 0,
    afterQty: 0,
    businessType: 'split_order',
    businessNo: bizNo,
    remark,
    operatorId,
  });
}

/**
 * 登记出库批次分配明细，供撤销(PUT)按批次精确回滚。
 * 注意 inv_outbound_batch_allocation 的 source_no / warehouse_id / batch_id 均为 NOT NULL，
 * 必须全部写入，否则运行时报 1364 Field doesn't have a default value。
 */
async function recordAllocation(
  conn: DbConnection,
  params: WidthSlitDeductParams,
  row: {
    materialId: number;
    batchId: number;
    batchNo: string;
    qty: number;
    unitPrice: number;
    fifoMode: string;
  }
): Promise<void> {
  await conn.execute(
    `INSERT INTO inv_outbound_batch_allocation (
      source_type, source_id, source_no, warehouse_id, material_id,
      batch_id, batch_no, allocated_qty, unit_cost, total_cost,
      fifo_mode, operator_id, operator_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      params.sourceType,
      params.sourceId,
      params.sourceNo,
      params.warehouseId,
      row.materialId,
      row.batchId,
      row.batchNo,
      row.qty,
      row.unitPrice,
      row.qty * row.unitPrice,
      row.fifoMode,
      params.operatorId ?? null,
      params.operatorName ?? null,
    ]
  );
}

/** 面积守恒扣减父/子批次（quantity 与 area 同事务更新，带 version 守卫）。 */
async function deductBatch(
  conn: DbConnection,
  batchId: number,
  version: number,
  qty: number
): Promise<void> {
  // ⚠️ MySQL 的 UPDATE ... SET 是「左到右求值，后续引用读到的是已更新值」。
  // 所以 area 必须放在 quantity 之后并直接乘 quantity（此处已是新值）；
  // 若写成 (quantity - ?) 会再减一次，导致 area 双扣（曾实测出现负面积）。
  const [upd]: DbResult = await conn.execute(
    `UPDATE inv_inventory_batch SET
      quantity = quantity - ?,
      available_qty = available_qty - ?,
      area = COALESCE(width,0) * COALESCE(length,0) * quantity,
      available_area = COALESCE(width,0) * COALESCE(length,0) * available_qty,
      version = version + 1,
      update_time = NOW()
    WHERE id = ? AND available_qty >= ? AND version = ?`,
    [qty, qty, batchId, qty, version]
  );
  const result = upd as unknown as DbResultSetHeader;
  if ((result.affectedRows ?? 0) === 0) {
    throw new Error(`批次扣减失败：版本冲突或可用量不足(id=${batchId})`);
  }
}

/**
 * 执行宽度感知扣减（含横切）。在事务内调用（conn 复用外层事务）。
 * - direct：直接扣减对应批次。
 * - slit：母卷生成需求宽子批(SC) → 母卷按面积当量扣减 → 子批立即出库 → 写撤销分配表。
 */
export async function executeWidthSlitDeduction(
  conn: DbConnection,
  plan: WidthSlitPlan,
  params: WidthSlitDeductParams
): Promise<{ deductionDetails: DbRow[]; totalCost: number }> {
  const deductionDetails: DbRow[] = [];
  let totalCost = 0;
  const whId = params.warehouseId;

  for (const a of plan.allocations) {
    if (a.mode === 'direct') {
      await deductBatch(conn, a.batch_id, a.version, a.allocate_qty);
      await invLog(
        conn,
        a.material_id,
        whId,
        a.batch_no,
        2,
        a.allocate_qty,
        params.sourceNo,
        `出库-${params.sourceNo}`,
        params.operatorId
      );
      if (params.sourceType === 'outbound_order') {
        await recordAllocation(conn, params, {
          materialId: a.material_id,
          batchId: a.batch_id,
          batchNo: a.batch_no,
          qty: a.allocate_qty,
          unitPrice: a.unit_price,
          fifoMode: 'fifo_auto',
        });
      }
      const lineCost = a.allocate_qty * a.unit_price;
      totalCost += lineCost;
      deductionDetails.push({ ...a, deducted_qty: a.allocate_qty, mode: 'direct', line_cost: lineCost });
    } else {
      // 横切：母卷 → 子批(SC, 需求宽度) → 子批立即出库
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const [mx]: DbResult = await conn.query(
        `SELECT MAX(batch_no) m FROM inv_inventory_batch WHERE batch_no LIKE ?`,
        [`SC${dateStr}%`]
      );
      const maxBatchNo = mx[0]?.m ? String(mx[0].m) : '';
      const seq = maxBatchNo
        ? String(parseInt(maxBatchNo.slice(-4)) + 1).padStart(4, '0')
        : '0001';
      const childBatchNo = `SC${dateStr}${seq}`;
      const childArea = a.consumed_area;

      const [ins]: DbResult = await conn.execute(
        `INSERT INTO inv_inventory_batch (
          batch_no, material_id, material_code, material_name,
          warehouse_id, quantity, available_qty, locked_qty, unit, unit_price,
          width, length, area, batch_type, parent_batch_id,
          inbound_date, produce_date, status, create_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 1, ?, CURDATE(), CURDATE(), 1, ?)`,
        [
          childBatchNo,
          a.material_id,
          a.material_code,
          a.material_name,
          whId,
          a.allocate_qty,
          a.allocate_qty,
          '米',
          a.unit_price,
          a.child_width,
          a.child_length,
          childArea,
          a.batch_id,
          params.operatorId ?? null,
        ]
      );
      const childId = (ins as unknown as DbResultSetHeader).insertId;

      // 母卷按面积当量扣减
      await deductBatch(conn, a.batch_id, a.version, a.parent_roll_equiv);
      // 子批立即出库（被本次出库单消耗）
      await deductBatch(conn, childId, 1, a.allocate_qty);

      // 流水：母料 out(横切) + 子批 in(分条) + 子批 out(出库单)
      await appendInventoryTransaction(conn, {
        transType: 'out',
        sourceType: 'split_order',
        sourceId: params.sourceId,
        materialId: a.material_id,
        batchNo: a.batch_no,
        warehouseId: whId,
        quantity: a.parent_roll_equiv,
        unitPrice: a.unit_price,
        totalAmount: a.unit_price * a.parent_roll_equiv,
        referenceNo: params.sourceNo,
        remark: `宽度横切母料出库-${a.batch_no}`,
        createBy: params.operatorId ?? null,
      });
      await appendInventoryTransaction(conn, {
        transType: 'in',
        sourceType: 'split_order',
        sourceId: params.sourceId,
        materialId: a.material_id,
        batchNo: childBatchNo,
        warehouseId: whId,
        quantity: a.allocate_qty,
        unitPrice: a.unit_price,
        totalAmount: a.unit_price * a.allocate_qty,
        referenceNo: params.sourceNo,
        remark: `宽度横切子批入库-${childBatchNo}`,
        createBy: params.operatorId ?? null,
      });
      await appendInventoryTransaction(conn, {
        transType: 'out',
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        materialId: a.material_id,
        batchNo: childBatchNo,
        warehouseId: whId,
        quantity: a.allocate_qty,
        unitPrice: a.unit_price,
        totalAmount: a.unit_price * a.allocate_qty,
        referenceNo: params.sourceNo,
        remark: `出库-${params.sourceNo}`,
        createBy: params.operatorId ?? null,
      });

      // 库存日志
      await invLog(conn, a.material_id, whId, a.batch_no, 2, a.parent_roll_equiv, params.sourceNo, `宽度横切母料出库-${a.batch_no}`, params.operatorId);
      await invLog(conn, a.material_id, whId, childBatchNo, 1, a.allocate_qty, params.sourceNo, `宽度横切子批入库-${childBatchNo}`, params.operatorId);
      await invLog(conn, a.material_id, whId, childBatchNo, 2, a.allocate_qty, params.sourceNo, `出库-${params.sourceNo}`, params.operatorId);

      // 撤销支持：只登记「母批 + 面积当量」。
      // 子批(SC)是本次出库派生出来并即刻消耗掉的中间物，撤销时不能把它也加回去，
      // 否则母卷面积 + 子卷面积会被双计。撤销只需把母卷面积当量还原，
      // 子批留 quantity=0 的历史记录（area=0，不影响汇总）。
      if (params.sourceType === 'outbound_order') {
        await recordAllocation(conn, params, {
          materialId: a.material_id,
          batchId: a.batch_id,
          batchNo: a.batch_no,
          qty: a.parent_roll_equiv,
          unitPrice: a.unit_price,
          fifoMode: 'width_slit',
        });
      }

      const lineCost = a.allocate_qty * a.unit_price;
      totalCost += lineCost;
      deductionDetails.push({
        ...a,
        deducted_qty: a.allocate_qty,
        child_batch_no: childBatchNo,
        mode: 'slit',
        line_cost: lineCost,
      });
    }

    // 汇总表由批次明细派生重算，杜绝双写漂移
    await recomputeInventorySummary(conn, a.material_id, whId);
  }

  return { deductionDetails, totalCost };
}
