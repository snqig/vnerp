/**
 * 物料成本提供者 — 对接库存模块物料成本表 / 油墨主数据
 *
 * 成本取值优先级：
 * 1. 按物料编码解析库存模块移动加权平均成本（inv_material.weighted_avg_cost）
 * 2. 按油墨编码解析油墨主数据计划价（base_ink.unit_price）
 * 3. 两者都解析不到 → 不写入返回的 Map（消费端据 unitCost=0 判定为「缺失」）
 *
 * 为什么按「编码」而不是按「id」解析：
 * dcprint_ink_formula_item.material_id 是跨表弱引用（该表没有指向物料或油墨的外键），
 * 同一个数字 id 既可指 inv_material.id，也可指 base_ink.id，而两张表的 id 域重叠
 * （实测：id=10 既是 base_ink 的「黑色油墨 INK-BLK-001」，也存在于 inv_material 中）。
 * 按 id 解析会让两套主数据的成本静默互换，因此以随条目落库的 material_code / ink_code
 * 作为唯一可靠键；仅当条目连编码都没有时，才退化为按 id 解析。
 *
 * 依据: docs/油墨配方版本管理完整落地方案.md 第七节
 */
import { query } from '@/lib/db';
import {
  IMaterialCostProvider,
  IMaterialCostRef,
} from '@/domain/dcprint/services/FormulaCostService';

export class MaterialCostProvider implements IMaterialCostProvider {
  /**
   * 批量获取物料单位成本
   * @returns Map<materialId, unitCost>；解析不到成本的物料不会出现在 Map 中
   */
  async getBatchCosts(items: ReadonlyArray<IMaterialCostRef>): Promise<Map<number, number>> {
    const costMap = new Map<number, number>();
    if (!items || items.length === 0) return costMap;

    const codeOf = (ref: IMaterialCostRef): string => (ref.code ?? '').trim();

    // 1) 编码优先：从库存模块获取移动加权平均成本
    const codes = Array.from(new Set(items.map(codeOf).filter((c) => c.length > 0)));
    if (codes.length > 0) {
      try {
        const rows = await query<any>(
          `SELECT material_code, weighted_avg_cost FROM inv_material
            WHERE deleted = 0 AND weighted_avg_cost IS NOT NULL AND weighted_avg_cost > 0
              AND material_code IN (${codes.map(() => '?').join(',')})`,
          codes
        );
        const costByCode = new Map<string, number>();
        for (const row of rows) {
          const cost = Number(row.weighted_avg_cost) || 0;
          if (cost > 0) costByCode.set(String(row.material_code), cost);
        }
        for (const ref of items) {
          const cost = costByCode.get(codeOf(ref));
          if (cost !== undefined) costMap.set(ref.id, cost);
        }
      } catch {
        // inv_material 不可用时忽略，继续尝试其它成本来源
      }
    }

    // 2) 编码未命中的，回退油墨主数据计划价（按 ink_code 解析，不按 id）
    const pendingCodes = Array.from(
      new Set(items.filter((ref) => !costMap.has(ref.id)).map(codeOf).filter((c) => c.length > 0))
    );
    if (pendingCodes.length > 0) {
      try {
        const rows = await query<any>(
          `SELECT ink_code, unit_price FROM base_ink
            WHERE deleted = 0 AND unit_price IS NOT NULL AND unit_price > 0
              AND ink_code IN (${pendingCodes.map(() => '?').join(',')})`,
          pendingCodes
        );
        const priceByCode = new Map<string, number>();
        for (const row of rows) {
          const price = Number(row.unit_price) || 0;
          if (price > 0) priceByCode.set(String(row.ink_code), price);
        }
        for (const ref of items) {
          if (costMap.has(ref.id)) continue;
          const price = priceByCode.get(codeOf(ref));
          if (price !== undefined) costMap.set(ref.id, price);
        }
      } catch {
        // base_ink 不可用时忽略
      }
    }

    // 3) 兜底：仅对「没有编码」的条目按 id 解析（无可靠键时的尽力而为）
    const codeLessIds = Array.from(
      new Set(items.filter((ref) => codeOf(ref).length === 0).map((ref) => ref.id))
    );
    if (codeLessIds.length > 0) {
      try {
        const rows = await query<any>(
          `SELECT id, weighted_avg_cost FROM inv_material
            WHERE deleted = 0 AND weighted_avg_cost IS NOT NULL AND weighted_avg_cost > 0
              AND id IN (${codeLessIds.map(() => '?').join(',')})`,
          codeLessIds
        );
        for (const row of rows) {
          const cost = Number(row.weighted_avg_cost) || 0;
          if (cost > 0 && !costMap.has(Number(row.id))) costMap.set(Number(row.id), cost);
        }
      } catch {
        // inv_material 不可用时忽略
      }
    }

    return costMap;
  }
}
