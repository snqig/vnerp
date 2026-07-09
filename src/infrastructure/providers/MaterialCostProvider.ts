/**
 * 物料成本提供者 — 对接库存模块物料成本表
 *
 * 成本取值优先级：
 * 1. 库存模块移动加权平均成本（inv_material.weighted_avg_cost）
 * 2. base_ink 表的计划价（base_ink.unit_price）
 * 3. 标记为缺失（0）
 *
 * 依据: docs/油墨配方版本管理完整落地方案.md 第七节
 */
import { query } from '@/lib/db';
import { IMaterialCostProvider } from '@/domain/dcprint/services/FormulaCostService';

export class MaterialCostProvider implements IMaterialCostProvider {
  /**
   * 批量获取物料单位成本
   * 查询优先级：inv_material.weighted_avg_cost → base_ink.unit_price
   */
  async getBatchCosts(materialIds: number[]): Promise<Map<number, number>> {
    const costMap = new Map<number, number>();
    if (!materialIds || materialIds.length === 0) return costMap;

    // 优先尝试从库存模块获取移动加权平均成本
    try {
      const invCosts: Loose = await query(
        `SELECT id, weighted_avg_cost FROM inv_material WHERE id IN (?) AND is_deleted = 0 AND weighted_avg_cost IS NOT NULL AND weighted_avg_cost > 0`,
        [materialIds]
      );
      for (const row of invCosts) {
        costMap.set(row.id, Number(row.weighted_avg_cost) || 0);
      }
    } catch {
      // inv_material 表可能不存在或无此字段，忽略错误降级
    }

    // 对未获取到成本的物料，从 base_ink 表获取计划价
    const missingIds = materialIds.filter((id) => !costMap.has(id));
    if (missingIds.length > 0) {
      try {
        const baseInkCosts: Loose = await query(
          `SELECT id, unit_price FROM base_ink WHERE id IN (?)`,
          [missingIds]
        );
        for (const row of baseInkCosts) {
          costMap.set(row.id, Number(row.unit_price) || 0);
        }
      } catch {
        // base_ink 表可能不存在，忽略
      }
    }

    return costMap;
  }
}
