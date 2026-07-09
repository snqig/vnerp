/**
 * 多色套印工艺核心模块
 * 丝网印刷特色支持：色序管理、网版匹配、油墨消耗计算
 */

import { query, execute, transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import { CalcParamService } from '@/lib/calc-param-service';

// ============================================================
// 类型定义
// ============================================================

export interface ColorSequence {
  seqNo: number;
  colorName: string;
  colorCode?: string;
  screenPlateId?: number;
  screenPlateCode?: string;
  inkFormulaId?: number;
  inkFormulaName?: string;
  meshCount?: number; // 网目数
  estimatedDurationHours: number;
  equipmentTypeRequired: string;
  dependsOnSeq?: number; // 依赖前序色序号
  dryingTimeMinutes?: number; // 干燥时间
  setupTimeMinutes?: number; // 准备时间
}

export interface InkConsumption {
  inkFormulaId: number;
  inkName: string;
  colorName: string;
  theoreticalConsumption: number; // 理论消耗(g)
  actualConsumption: number; // 实际消耗(g，含损耗)
  unitPrice: number; // 单价
  totalCost: number; // 总成本
  coverageArea: number; // 覆盖面积(cm²)
  inkThickness: number; // 油墨厚度(μm)
  lossRate: number; // 损耗率
}

export interface MultiColorWorkOrder {
  workOrderId: number;
  workOrderNo: string;
  productName: string;
  planQty: number;
  colorSequences: ColorSequence[];
  printArea: number; // 印刷面积 cm²
  substrateType: string; // 承印材料类型
  totalColors: number;
}

// ============================================================
// 油墨消耗计算
// ============================================================

/**
 * 计算油墨消耗量
 * 公式：消耗量(g) = 印刷面积(cm²) × 油墨厚度(μm) × 油墨密度(g/cm³) × 数量 × (1 + 损耗率)
 */
export function calculateInkConsumption(
  printArea: number, // cm²
  inkThickness: number, // μm (微米)
  inkDensity: number, // g/cm³
  quantity: number,
  lossRate?: number // 损耗率，默认从 sys_calc_param 读取（默认 0.15）
): number {
  const effectiveLossRate =
    lossRate ?? CalcParamService.getCachedDecimal('printing.default_loss_rate', 0.15);
  // 厚度转换: μm → cm (1μm = 0.0001cm)
  const thicknessCm = inkThickness * 0.0001;
  // 体积 = 面积 × 厚度
  const volume = printArea * thicknessCm;
  // 质量 = 体积 × 密度
  const mass = volume * inkDensity;
  // 总消耗 = 单件质量 × 数量 × (1 + 损耗率)
  const totalConsumption = mass * quantity * (1 + effectiveLossRate);
  return Math.round(totalConsumption * 100) / 100;
}

/**
 * 获取油墨配方信息
 */
export async function getInkFormula(inkFormulaId: number): Promise<any> {
  const rows: any = await query(
    `SELECT id, formula_name, formula_code, ink_type, color_name, color_code,
            ink_density, default_thickness, default_loss_rate, unit_price, unit
     FROM prd_ink_formula
     WHERE id = ? AND deleted = 0`,
    [inkFormulaId]
  );
  return rows[0] || null;
}

/**
 * 计算多色套印油墨消耗明细
 */
export async function calculateMultiColorInkConsumption(
  workOrder: MultiColorWorkOrder
): Promise<InkConsumption[]> {
  const results: InkConsumption[] = [];

  for (const seq of workOrder.colorSequences) {
    if (!seq.inkFormulaId) continue;

    const formula = await getInkFormula(seq.inkFormulaId);
    if (!formula) {
      secureLog('warn', '油墨配方不存在', { inkFormulaId: seq.inkFormulaId, seqNo: seq.seqNo });
      continue;
    }

    const inkDensity = formula.ink_density || 1.2; // 默认密度 g/cm³
    const inkThickness = formula.default_thickness || 15; // 默认厚度 μm
    const lossRate =
      formula.default_loss_rate ??
      CalcParamService.getCachedDecimal('printing.default_loss_rate', 0.15);
    const unitPrice = formula.unit_price || 0;

    const theoreticalConsumption = calculateInkConsumption(
      workOrder.printArea,
      inkThickness,
      inkDensity,
      workOrder.planQty,
      0 // 理论值不含损耗
    );

    const actualConsumption = calculateInkConsumption(
      workOrder.printArea,
      inkThickness,
      inkDensity,
      workOrder.planQty,
      lossRate
    );

    results.push({
      inkFormulaId: seq.inkFormulaId,
      inkName: formula.formula_name,
      colorName: seq.colorName,
      theoreticalConsumption,
      actualConsumption,
      unitPrice,
      totalCost: Math.round(actualConsumption * unitPrice * 100) / 100,
      coverageArea: workOrder.printArea * workOrder.planQty,
      inkThickness,
      lossRate,
    });
  }

  return results;
}

// ============================================================
// 网版匹配与管理
// ============================================================

/**
 * 查找合适的网版
 */
export async function findSuitableScreenPlate(
  colorName: string,
  meshCount?: number,
  customerId?: number
): Promise<any[]> {
  let sql = `
    SELECT id, plate_code, plate_name, plate_type, mesh_count, size_spec,
           customer_id, product_name, remaining_count, status
    FROM prd_screen_plate
    WHERE deleted = 0 AND status = 1
      AND (remaining_count > 0 OR remaining_count IS NULL)
  `;
  const params: any[] = [];

  if (colorName) {
    sql += ` AND (plate_name LIKE ? OR product_name LIKE ?)`;
    params.push(`%${colorName}%`, `%${colorName}%`);
  }

  if (meshCount) {
    sql += ` AND mesh_count = ?`;
    params.push(meshCount);
  }

  if (customerId) {
    sql += ` AND (customer_id = ? OR customer_id IS NULL)`;
    params.push(customerId);
  }

  sql += ` ORDER BY 
    CASE WHEN customer_id = ? THEN 0 ELSE 1 END,
    remaining_count DESC,
    create_time DESC`;
  params.push(customerId || 0);

  const rows: any = await query(sql, params);
  return rows;
}

/**
 * 更新网版使用次数
 */
export async function updateScreenPlateUsage(
  plateId: number,
  usedCount: number = 1
): Promise<boolean> {
  try {
    await execute(
      `UPDATE prd_screen_plate SET
        used_count = COALESCE(used_count, 0) + ?,
        remaining_count = GREATEST(0, COALESCE(remaining_count, 0) - ?),
        update_time = NOW()
      WHERE id = ?`,
      [usedCount, usedCount, plateId]
    );
    return true;
  } catch (error: any) {
    secureLog('error', '更新网版使用次数失败', { error: error.message, plateId });
    return false;
  }
}

// ============================================================
// 工艺卡 → 生产工单转换
// ============================================================

/**
 * 从标准卡/工艺卡提取色序信息
 */
export async function extractColorSequencesFromStandardCard(
  standardCardId: number
): Promise<ColorSequence[]> {
  // 查询工艺卡的颜色信息
  const rows: any = await query(
    `SELECT color_sequence, special_color, color_formula
     FROM prd_standard_card
     WHERE id = ? AND deleted = 0`,
    [standardCardId]
  );

  if (rows.length === 0) {
    return [];
  }

  const card = rows[0];
  const sequences: ColorSequence[] = [];

  // 解析色序（假设格式为 JSON 或逗号分隔）
  if (card.color_sequence) {
    try {
      const colors = JSON.parse(card.color_sequence);
      colors.forEach((color: any, index: number) => {
        sequences.push({
          seqNo: index + 1,
          colorName: color.name || color.color_name || `色${index + 1}`,
          colorCode: color.code || color.color_code,
          meshCount: color.mesh_count || 120,
          estimatedDurationHours: color.duration_hours || 4,
          equipmentTypeRequired: color.equipment_type || 'printing',
          dependsOnSeq: index > 0 ? index : undefined,
          dryingTimeMinutes: color.drying_time || 30,
          setupTimeMinutes: color.setup_time || 45,
        });
      });
    } catch {
      // 如果不是 JSON，按逗号分隔解析
      const colorNames = String(card.color_sequence).split(/[,，]/);
      colorNames.forEach((name: string, index: number) => {
        if (name.trim()) {
          sequences.push({
            seqNo: index + 1,
            colorName: name.trim(),
            estimatedDurationHours: 4,
            equipmentTypeRequired: 'printing',
            dependsOnSeq: index > 0 ? index : undefined,
            dryingTimeMinutes: 30,
            setupTimeMinutes: 45,
          });
        }
      });
    }
  }

  // 查询专色信息
  if (card.special_color && sequences.length === 0) {
    const specialColors = String(card.special_color).split(/[,，]/);
    specialColors.forEach((name: string, index: number) => {
      if (name.trim()) {
        sequences.push({
          seqNo: index + 1,
          colorName: name.trim(),
          estimatedDurationHours: 4,
          equipmentTypeRequired: 'printing',
          dependsOnSeq: index > 0 ? index : undefined,
          dryingTimeMinutes: 30,
          setupTimeMinutes: 45,
        });
      }
    });
  }

  return sequences;
}

/**
 * 创建多色套印工单
 */
export async function createMultiColorWorkOrder(
  standardCardId: number,
  salesOrderId: number,
  planQty: number,
  printArea: number,
  substrateType: string = 'paper'
): Promise<{
  success: boolean;
  workOrderId?: number;
  message: string;
  colorSequences?: ColorSequence[];
}> {
  try {
    const colorSequences = await extractColorSequencesFromStandardCard(standardCardId);

    if (colorSequences.length === 0) {
      return { success: false, message: '工艺卡中未找到色序信息' };
    }

    const result = await transaction(async (conn) => {
      // 1. 创建生产工单
      const now = new Date();
      const workOrderNo = `WO${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      const [woResult]: any = await conn.execute(
        `INSERT INTO prd_work_order (
          work_order_no, work_order_date, sales_order_id,
          material_id, plan_qty, unit, status, priority, remark
        ) VALUES (?, CURDATE(), ?, ?, ?, 'pcs', 1, 2, ?)`,
        [workOrderNo, salesOrderId, standardCardId, planQty, `多色套印: ${colorSequences.length}色`]
      );

      const workOrderId = woResult.insertId;

      // 2. 创建色序记录
      for (const seq of colorSequences) {
        // 查找合适的网版
        const plates = await findSuitableScreenPlate(seq.colorName, seq.meshCount);
        const selectedPlate = plates.length > 0 ? plates[0] : null;

        // 查找油墨配方
        const inkRows: any = await query(
          `SELECT id FROM prd_ink_formula
           WHERE color_name = ? AND deleted = 0
           ORDER BY create_time DESC LIMIT 1`,
          [seq.colorName]
        );
        const inkFormulaId = inkRows.length > 0 ? inkRows[0].id : null;

        await conn.execute(
          `INSERT INTO prd_work_order_color_seq (
            work_order_id, seq_no, color_name,
            screen_plate_id, ink_formula_id,
            estimated_duration_hours, equipment_type_required, depends_on_seq
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            workOrderId,
            seq.seqNo,
            seq.colorName,
            selectedPlate?.id || null,
            inkFormulaId,
            seq.estimatedDurationHours,
            seq.equipmentTypeRequired,
            seq.dependsOnSeq || null,
          ]
        );
      }

      return { workOrderId, workOrderNo, colorSequences };
    });

    secureLog('info', '多色套印工单创建成功', {
      workOrderId: result.workOrderId,
      workOrderNo: result.workOrderNo,
      colorCount: result.colorSequences.length,
    });

    return {
      success: true,
      workOrderId: result.workOrderId,
      message: `多色套印工单创建成功: ${result.workOrderNo}, 共${result.colorSequences.length}色`,
      colorSequences: result.colorSequences,
    };
  } catch (error: any) {
    secureLog('error', '创建多色套印工单失败', { error: error.message, standardCardId });
    return { success: false, message: `创建失败: ${error.message}` };
  }
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 获取工单色序详情（含网版、油墨信息）
 */
export async function getWorkOrderColorSequencesDetail(workOrderId: number): Promise<any[]> {
  const rows: any = await query(
    `SELECT
      cs.*,
      sp.plate_code as screen_plate_code,
      sp.plate_name as screen_plate_name,
      sp.mesh_count,
      sp.remaining_count as plate_remaining,
      if.formula_name as ink_formula_name,
      if.color_code as ink_color_code,
      if.ink_density,
      if.default_thickness,
      if.unit_price as ink_unit_price
    FROM prd_work_order_color_seq cs
    LEFT JOIN prd_screen_plate sp ON cs.screen_plate_id = sp.id
    LEFT JOIN prd_ink_formula if ON cs.ink_formula_id = if.id
    WHERE cs.work_order_id = ?
    ORDER BY cs.seq_no`,
    [workOrderId]
  );

  return rows;
}

/**
 * 计算工单总油墨成本
 */
export async function calculateWorkOrderInkCost(
  workOrderId: number,
  printArea: number,
  planQty: number
): Promise<{ totalCost: number; details: InkConsumption[] }> {
  const colorSeqs = await getWorkOrderColorSequencesDetail(workOrderId);

  const workOrder: MultiColorWorkOrder = {
    workOrderId,
    workOrderNo: '',
    productName: '',
    planQty,
    colorSequences: colorSeqs.map((cs: any) => ({
      seqNo: cs.seq_no,
      colorName: cs.color_name,
      inkFormulaId: cs.ink_formula_id,
      estimatedDurationHours: cs.estimated_duration_hours,
      equipmentTypeRequired: cs.equipment_type_required,
    })),
    printArea,
    substrateType: 'paper',
    totalColors: colorSeqs.length,
  };

  const details = await calculateMultiColorInkConsumption(workOrder);
  const totalCost = details.reduce((sum, d) => sum + d.totalCost, 0);

  return { totalCost, details };
}
