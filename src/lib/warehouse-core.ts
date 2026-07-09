/**
 * 仓库管理核心原则实现
 * 1. 先进先出 (FIFO) 原则
 * 2. 小料拆分原则
 * 3. 整料锁定机制
 * 4. 余料优先机制
 */

import { query, execute, transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import { getConfig } from '@/lib/global-config';

// ============================================================
// 类型定义
// ============================================================

export interface BatchAllocation {
  batchId: number;
  batchNo: string;
  qrCode: string;
  quantity: number;
  unitCost: number;
  splitFlag: number; // 0-整料, 1-小料, 2-余料
  inboundDate: string;
  expireDate: string;
  warehouseId: number;
  location: string;
}

export interface FIFOAllocationResult {
  success: boolean;
  allocations: BatchAllocation[];
  totalAllocated: number;
  remainingNeed: number;
  message: string;
}

export interface MaterialSplitResult {
  success: boolean;
  splitNo: string;
  smallMaterialQRCode: string;
  remainderQRCode?: string;
  splitQuantity: number;
  remainderQuantity: number;
  unitCost: number;
  message: string;
}

// ============================================================
// FIFO 批次分配
// ============================================================

/**
 * FIFO 批次分配算法
 * 1. 优先使用余料 (split_flag=2)
 * 2. 再按入库时间排序 (inbound_date ASC)
 * 3. 再按效期排序 (expire_date ASC)
 */
export async function allocateFIFO(
  materialId: number,
  quantity: number,
  warehouseId?: number
): Promise<FIFOAllocationResult> {
  try {
    // 检查是否启用FIFO
    const fifoEnabled = getConfig('fifo_enabled');
    if (!fifoEnabled) {
      // FIFO未启用，返回所有可用批次
      const allBatches: Loose = await query(
        `SELECT * FROM inv_inventory_batch
         WHERE material_id = ? AND remaining_quantity > 0 AND status = 1
         ${warehouseId ? 'AND warehouse_id = ?' : ''}
         ORDER BY inbound_date ASC, id ASC`,
        warehouseId ? [materialId, warehouseId] : [materialId]
      );

      return allocateFromBatches(allBatches, quantity);
    }

    // FIFO启用：余料优先 → 入库时间 → 效期
    const batches: Loose = await query(
      `SELECT * FROM inv_inventory_batch
       WHERE material_id = ? AND remaining_quantity > 0 AND status = 1
       ${warehouseId ? 'AND warehouse_id = ?' : ''}
       ORDER BY
         CASE WHEN split_flag = 2 THEN 0 ELSE 1 END ASC,  -- 余料优先
         expire_date ASC,  -- 先到期先出
         inbound_date ASC, -- 再按入库时间
         id ASC`,
      warehouseId ? [materialId, warehouseId] : [materialId]
    );

    return allocateFromBatches(batches, quantity);
  } catch (error) {
    secureLog('error', 'FIFO批次分配失败', {
      error: (error as Error).message,
      materialId,
      quantity,
    });
    return {
      success: false,
      allocations: [],
      totalAllocated: 0,
      remainingNeed: quantity,
      message: `FIFO分配失败: ${(error as Error).message}`,
    };
  }
}

function allocateFromBatches(batches: Loose[], quantity: number): FIFOAllocationResult {
  const allocations: BatchAllocation[] = [];
  let remainingNeed = quantity;
  let totalAllocated = 0;

  for (const batch of batches) {
    if (remainingNeed <= 0) break;

    const availableQty = parseFloat(batch.remaining_quantity);
    const allocateQty = Math.min(remainingNeed, availableQty);

    allocations.push({
      batchId: batch.id,
      batchNo: batch.batch_no,
      qrCode: batch.qr_code,
      quantity: allocateQty,
      unitCost: parseFloat(batch.unit_cost) || 0,
      splitFlag: batch.split_flag,
      inboundDate: batch.inbound_date,
      expireDate: batch.expire_date,
      warehouseId: batch.warehouse_id,
      location: batch.location,
    });

    totalAllocated += allocateQty;
    remainingNeed -= allocateQty;
  }

  const success = remainingNeed <= 0;
  return {
    success,
    allocations,
    totalAllocated,
    remainingNeed: Math.max(0, remainingNeed),
    message: success
      ? `成功分配 ${totalAllocated} 数量`
      : `库存不足，已分配 ${totalAllocated}，还差 ${remainingNeed}`,
  };
}

// ============================================================
// 整料检查与小料拆分
// ============================================================

/**
 * 检查是否为整料（禁止直接领用）
 */
export async function checkWholeMaterial(qrCode: string): Promise<{
  isWhole: boolean;
  materialId?: number;
  message: string;
}> {
  const rows: Loose = await query(
    `SELECT * FROM inv_inventory_batch WHERE qr_code = ? AND deleted = 0`,
    [qrCode]
  );

  if (rows.length === 0) {
    return { isWhole: false, message: '二维码不存在' };
  }

  const batch = rows[0];
  const allowWholeIssue = getConfig('allow_whole_material_issue');

  if (batch.split_flag === 0 && !allowWholeIssue) {
    return {
      isWhole: true,
      materialId: batch.material_id,
      message: '整料禁止直接领用，请先拆分小料',
    };
  }

  return {
    isWhole: false,
    materialId: batch.material_id,
    message: '可以领用',
  };
}

/**
 * 小料拆分
 * 将整料按标准单位拆分为小料和余料
 */
export async function splitMaterial(
  parentQRCode: string,
  splitQuantity?: number,
  operatorId?: number
): Promise<MaterialSplitResult> {
  try {
    const result = await transaction(async (conn) => {
      // 1. 查询整料信息
      const [batchRows]: Loose = await conn.execute(
        `SELECT * FROM inv_inventory_batch
         WHERE qr_code = ? AND split_flag = 0 AND status = 1 AND deleted = 0`,
        [parentQRCode]
      );

      if (batchRows.length === 0) {
        throw new Error('整料不存在或已拆分');
      }

      const wholeMaterial = batchRows[0];
      const materialId = wholeMaterial.material_id;
      const totalQty = parseFloat(wholeMaterial.quantity);
      const unitCost = parseFloat(wholeMaterial.unit_cost) || 0;

      // 2. 获取物料信息和拆分标准
      const [materialRows]: Loose = await conn.execute(
        `SELECT material_type, unit FROM inv_material WHERE id = ?`,
        [materialId]
      );

      if (materialRows.length === 0) {
        throw new Error('物料不存在');
      }

      const material = materialRows[0];
      const materialType = material.material_type;

      // 3. 确定拆分标准
      let standardSplitQty = splitQuantity;
      if (!standardSplitQty) {
        standardSplitQty = getSplitStandard(materialType);
      }

      if (standardSplitQty <= 0) {
        throw new Error('拆分标准未配置');
      }

      // 4. 计算拆分数量
      const splitCount = Math.floor(totalQty / standardSplitQty);
      const remainderQty = totalQty - splitCount * standardSplitQty;

      if (splitCount === 0) {
        throw new Error('数量不足，无法按标准拆分');
      }

      // 5. 生成拆分编号
      const now = new Date();
      const splitNo = `SP${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      // 6. 冻结整料
      await conn.execute(
        `UPDATE inv_inventory_batch SET status = 2, update_time = NOW()
         WHERE id = ?`,
        [wholeMaterial.id]
      );

      // 7. 创建小料批次
      const smallMaterialQR = `SM-${parentQRCode}-${Date.now()}`;
      await conn.execute(
        `INSERT INTO inv_inventory_batch (
          material_id, batch_no, qr_code, quantity, remaining_quantity,
          unit_cost, warehouse_id, location, split_flag, parent_qr_code,
          inbound_date, expire_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 1)`,
        [
          materialId,
          splitNo,
          smallMaterialQR,
          splitCount * standardSplitQty,
          splitCount * standardSplitQty,
          unitCost,
          wholeMaterial.warehouse_id,
          wholeMaterial.location,
          parentQRCode,
          wholeMaterial.inbound_date,
          wholeMaterial.expire_date,
        ]
      );

      // 8. 创建余料批次（如果有）
      let remainderQR: string | undefined;
      if (remainderQty > 0) {
        remainderQR = `RM-${parentQRCode}-${Date.now()}`;
        await conn.execute(
          `INSERT INTO inv_inventory_batch (
            material_id, batch_no, qr_code, quantity, remaining_quantity,
            unit_cost, warehouse_id, location, split_flag, parent_qr_code,
            inbound_date, expire_date, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 2, ?, ?, ?, 1)`,
          [
            materialId,
            `${splitNo}-RM`,
            remainderQR,
            remainderQty,
            remainderQty,
            unitCost,
            wholeMaterial.warehouse_id,
            wholeMaterial.location,
            parentQRCode,
            wholeMaterial.inbound_date,
            wholeMaterial.expire_date,
          ]
        );
      }

      // 9. 记录拆分日志
      await conn.execute(
        `INSERT INTO inv_inventory_log (
          material_id, warehouse_id, batch_no, operation_type, operation_qty,
          before_qty, after_qty, business_type, business_no, remark, operator_id
        ) VALUES (?, ?, ?, 3, ?, ?, ?, '小料拆分', ?, ?, ?)`,
        [
          materialId,
          wholeMaterial.warehouse_id,
          wholeMaterial.batch_no,
          totalQty,
          totalQty,
          0,
          splitNo,
          `整料${parentQRCode}拆分为${splitCount}个小料${remainderQty > 0 ? `+1个余料` : ''}`,
          operatorId,
        ]
      );

      // 10. 创建小料成本记录
      await conn.execute(
        `INSERT INTO material_batch_costs (
          qr_code, material_id, material_code, material_name, batch_no,
          quantity, unit_cost, total_cost, remaining_quantity, split_flag, warehouse_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          smallMaterialQR,
          materialId,
          wholeMaterial.material_code || '',
          wholeMaterial.material_name || '',
          splitNo,
          splitCount * standardSplitQty,
          unitCost,
          unitCost * splitCount * standardSplitQty,
          splitCount * standardSplitQty,
          wholeMaterial.warehouse_id,
        ]
      );

      return {
        splitNo,
        smallMaterialQR,
        remainderQR,
        splitQuantity: splitCount * standardSplitQty,
        remainderQuantity: remainderQty,
        unitCost,
      };
    });

    secureLog('info', '小料拆分成功', {
      parentQRCode,
      splitNo: result.splitNo,
      smallMaterialQR: result.smallMaterialQR,
    });

    return {
      success: true,
      splitNo: result.splitNo,
      smallMaterialQRCode: result.smallMaterialQR,
      remainderQRCode: result.remainderQR,
      splitQuantity: result.splitQuantity,
      remainderQuantity: result.remainderQuantity,
      unitCost: result.unitCost,
      message: `拆分成功：生成小料${result.splitQuantity}${result.remainderQuantity > 0 ? `，余料${result.remainderQuantity}` : ''}`,
    };
  } catch (error) {
    secureLog('error', '小料拆分失败', { error: (error as Error).message, parentQRCode });
    return {
      success: false,
      splitNo: '',
      smallMaterialQRCode: '',
      splitQuantity: 0,
      remainderQuantity: 0,
      unitCost: 0,
      message: `拆分失败: ${(error as Error).message}`,
    };
  }
}

/**
 * 获取物料拆分标准
 */
function getSplitStandard(materialType: string): number {
  const configMap: Record<string, string> = {
    pet_film: 'film_split_length',
    pvc_film: 'pvc_split_length',
    ink: 'ink_split_weight',
    solvent: 'solvent_split_volume',
    mesh: 'mesh_split_length',
  };

  const configKey = configMap[materialType];
  if (!configKey) {
    // 默认拆分标准
    return 10;
  }

  const value = getConfig(configKey);
  return Number(value) || 10;
}

// ============================================================
// 出库校验
// ============================================================

/**
 * 强制校验FIFO
 * 如果不是推荐批次，记录异常并需要审批
 */
export async function enforceFIFO(
  materialId: number,
  batchNo: string,
  requisitionId?: number
): Promise<{
  isValid: boolean;
  recommendedBatchNo?: string;
  needsApproval: boolean;
  message: string;
}> {
  const fifoEnabled = getConfig('fifo_enabled');
  if (!fifoEnabled) {
    return { isValid: true, needsApproval: false, message: 'FIFO未启用' };
  }

  // 获取推荐批次
  const allocation = await allocateFIFO(materialId, 1);
  if (!allocation.success || allocation.allocations.length === 0) {
    return { isValid: false, needsApproval: false, message: '无可用批次' };
  }

  const recommendedBatchNo = allocation.allocations[0].batchNo;

  if (batchNo === recommendedBatchNo) {
    return { isValid: true, recommendedBatchNo, needsApproval: false, message: 'FIFO校验通过' };
  }

  // 非FIFO批次，需要审批
  return {
    isValid: false,
    recommendedBatchNo,
    needsApproval: true,
    message: `非FIFO批次：推荐[${recommendedBatchNo}]，实际[${batchNo}]，需要提交异常申请`,
  };
}

/**
 * 记录FIFO异常覆盖
 */
export async function logFIFOOverride(
  materialId: number,
  recommendedBatchNo: string,
  actualBatchNo: string,
  reason: string,
  operatorId?: number,
  operatorName?: string,
  requisitionId?: number
): Promise<number> {
  const result: Loose = await execute(
    `INSERT INTO inv_fifo_override_log (
      material_id, recommended_batch_no, actual_batch_no,
      requisition_id, reason, operator_id, operator_name, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      materialId,
      recommendedBatchNo,
      actualBatchNo,
      requisitionId || null,
      reason,
      operatorId || null,
      operatorName || '',
    ]
  );

  return result.insertId;
}

// ============================================================
// 库存查询
// ============================================================

/**
 * 查询物料批次库存
 */
export async function queryMaterialBatches(
  materialId: number,
  warehouseId?: number
): Promise<Loose[]> {
  const rows: Loose = await query(
    `SELECT
      b.*,
      m.material_code,
      m.material_name,
      m.material_type,
      m.unit,
      w.warehouse_name
    FROM inv_inventory_batch b
    LEFT JOIN inv_material m ON b.material_id = m.id
    LEFT JOIN inv_warehouse w ON b.warehouse_id = w.id
    WHERE b.material_id = ? AND b.remaining_quantity > 0
      AND b.status = 1 AND b.deleted = 0
      ${warehouseId ? 'AND b.warehouse_id = ?' : ''}
    ORDER BY
      CASE WHEN b.split_flag = 2 THEN 0 ELSE 1 END ASC,
      b.expire_date ASC,
      b.inbound_date ASC`,
    warehouseId ? [materialId, warehouseId] : [materialId]
  );

  return rows;
}

/**
 * 查询即将过期物料
 */
export async function queryExpiringMaterials(days: number = 30): Promise<Loose[]> {
  const rows: Loose = await query(
    `SELECT
      b.*,
      m.material_code,
      m.material_name,
      m.unit,
      DATEDIFF(b.expire_date, CURDATE()) as days_remaining
    FROM inv_inventory_batch b
    LEFT JOIN inv_material m ON b.material_id = m.id
    WHERE b.status = 1 AND b.remaining_quantity > 0
      AND b.expire_date IS NOT NULL
      AND DATEDIFF(b.expire_date, CURDATE()) <= ?
      AND DATEDIFF(b.expire_date, CURDATE()) >= 0
    ORDER BY days_remaining ASC`,
    [days]
  );

  return rows;
}

/**
 * 查询呆滞料
 */
export async function queryObsoleteMaterials(days: number = 90): Promise<Loose[]> {
  const rows: Loose = await query(
    `SELECT
      b.*,
      m.material_code,
      m.material_name,
      m.unit,
      DATEDIFF(CURDATE(), b.inbound_date) as days_in_stock
    FROM inv_inventory_batch b
    LEFT JOIN inv_material m ON b.material_id = m.id
    WHERE b.status = 1 AND b.remaining_quantity > 0
      AND DATEDIFF(CURDATE(), b.inbound_date) >= ?
    ORDER BY days_in_stock DESC`,
    [days]
  );

  return rows;
}
