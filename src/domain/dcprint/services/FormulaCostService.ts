/**
 * 配方成本计算领域服务
 *
 * 核心规则：
 * - 理论成本 = Σ (配比比例% × 原料单位成本)
 * - 成本取值优先级：移动加权平均成本 → 计划价 → 标记缺失
 * - 精度：成本保留 4 位小数，配比保留 3 位
 *
 * 依据: docs/油墨配方版本管理完整落地方案.md 第七节
 */
import { FormulaItemVO } from '../value-objects/FormulaItemVO';
import { CostSnapshotResult } from '../aggregates/InkFormulaVersion';

/**
 * 物料成本提供者接口（依赖倒置）
 * 基础设施层实现此接口，对接库存模块物料成本表
 */
export interface IMaterialCostProvider {
  /**
   * 批量获取物料单位成本
   * @param materialIds 物料 ID 列表
   * @returns Map<materialId, unitCost>
   */
  getBatchCosts(materialIds: number[]): Promise<Map<number, number>>;
}

export interface CostCalculationItem {
  materialCode: string;
  materialName: string;
  ratio: number;
  unitCost: number;
  itemCost: number;
  hasCost: boolean;
}

export interface CostCalculationResult {
  totalCost: number;
  itemCosts: CostCalculationItem[];
  missingCount: number;
  warnings: string[];
  status: number; // 0-未计算 1-完成 2-部分缺失
}

export class FormulaCostService {
  constructor(private readonly costProvider?: IMaterialCostProvider) {}

  /**
   * 计算配方理论成本
   * @param items 配方明细列表
   * @param costMap 物料成本映射（可选，若提供则不调用 costProvider）
   */
  async calculate(
    items: FormulaItemVO[],
    costMap?: Map<number, number>
  ): Promise<CostCalculationResult> {
    if (items.length === 0) {
      return { totalCost: 0, itemCosts: [], missingCount: 0, warnings: [], status: 0 };
    }

    // 获取成本数据
    let resolvedCostMap = costMap;
    if (!resolvedCostMap && this.costProvider) {
      const materialIds = items.filter((i) => i.materialId).map((i) => i.materialId!) as number[];
      resolvedCostMap = await this.costProvider.getBatchCosts(materialIds);
    }
    resolvedCostMap = resolvedCostMap ?? new Map<number, number>();

    let totalCost = 0;
    let missingCount = 0;
    const warnings: string[] = [];
    const itemCosts: CostCalculationItem[] = items.map((item) => {
      const unitCost = item.materialId ? (resolvedCostMap!.get(item.materialId) ?? 0) : 0;
      const hasCost = unitCost > 0 || !item.materialId;
      if (unitCost === 0 && item.materialId) {
        missingCount++;
        warnings.push(`${item.materialName} 缺少成本数据`);
      }
      const itemCost = (Number(item.ratio) / 100) * unitCost;
      totalCost += itemCost;
      return {
        materialCode: item.materialCode,
        materialName: item.materialName,
        ratio: Number(item.ratio),
        unitCost,
        itemCost: Number(itemCost.toFixed(4)),
        hasCost,
      };
    });

    const status = missingCount === 0 ? 1 : 2;

    return {
      totalCost: Number(totalCost.toFixed(4)),
      itemCosts,
      missingCount,
      warnings,
      status,
    };
  }

  /**
   * 将成本计算结果转为快照结果（用于聚合根 snapshotCost）
   */
  toSnapshotResult(result: CostCalculationResult): CostSnapshotResult {
    return {
      totalCost: result.totalCost,
      itemCosts: result.itemCosts.map((c) => ({
        materialCode: c.materialCode,
        unitCost: c.unitCost,
        itemCost: c.itemCost,
      })),
      status: result.status,
      warning: result.warnings.length > 0 ? result.warnings.join('; ') : null,
    };
  }
}
