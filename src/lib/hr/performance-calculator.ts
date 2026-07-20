export interface PerformanceResult {
  baseAmount: number;
  kpiScore: number;
  qualityRate: number;
  scoreCoefficient: number;
  finalAmount: number;
}

interface KpiDimension {
  name: string;
  weight: number;    // 权重 %
  score: number;     // 得分 0-100
}

const DEFAULT_DIMENSIONS: KpiDimension[] = [
  { name: '产量达成率', weight: 40, score: 0 },
  { name: '质量合格率', weight: 30, score: 0 },
  { name: '设备稼动率', weight: 15, score: 0 },
  { name: '5S现场管理', weight: 15, score: 0 },
];

/**
 * 计算绩效奖金
 * @param baseAmount 绩效基数
 * @param dimensions 各维度评分（使用默认维度及权重）
 * @param qualityRate 质量达标率 (0-1)
 */
export function calculatePerformanceBonus(
  baseAmount: number,
  dimensions: KpiDimension[] = DEFAULT_DIMENSIONS,
  qualityRate: number = 1
): PerformanceResult {
  const totalWeight = dimensions.reduce((s, d) => s + d.weight, 0);
  const weightedScore = dimensions.reduce(
    (s, d) => s + (d.score * d.weight) / totalWeight,
    0
  );
  const scoreCoefficient = weightedScore / 100;
  const finalAmount = baseAmount * scoreCoefficient * qualityRate;

  return {
    baseAmount,
    kpiScore: weightedScore,
    qualityRate,
    scoreCoefficient,
    finalAmount: Math.round(finalAmount * 100) / 100,
  };
}

/**
 * 综合KPI评分（带行业默认权重）
 */
export function calculateKpiScore(
  productionRate: number,   // 产量达成率 0-1
  qualityRate: number,      // 质量合格率 0-1
  equipmentRate: number,    // 设备稼动率 0-1
  siteScore: number         // 5S评分 0-100
): number {
  return (
    productionRate * 100 * 0.4 +
    qualityRate * 100 * 0.3 +
    equipmentRate * 100 * 0.15 +
    siteScore * 0.15
  );
}
