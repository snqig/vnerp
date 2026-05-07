import { query, execute, transaction } from '@/lib/db';

export interface DieTemplate {
  id: number;
  template_no: string;
  name: string;
  width: number;
  height: number;
  shape_type: string;
  material_type: string;
  max_uses: number;
  current_uses: number;
  remaining_life: number;
  status: string;
  compatible_products: string[];
}

export interface DieMatchResult {
  die_id: number;
  die_no: string;
  die_name: string;
  match_score: number;
  match_details: {
    size_match: number;
    shape_match: number;
    material_match: number;
    life_match: number;
  };
  can_use: boolean;
  warnings: string[];
}

export interface ProductSpec {
  width: number;
  height: number;
  shape_type: string;
  material_type: string;
  tolerance: number;
}

const SHAPE_COMPATIBILITY: Record<string, string[]> = {
  rectangle: ['rectangle', 'square'],
  square: ['square'],
  circle: ['circle'],
  oval: ['oval', 'circle'],
  irregular: ['irregular'],
};

const MATERIAL_GROUPS: string[][] = [
  ['钢材', '铁材', '合金钢', '碳钢', '不锈钢', '合金'],
  ['尼龙网', '聚酯网', '不锈钢网', '丝网', '聚酯', '聚酰胺'],
  ['橡胶', '硅胶', '树脂', '聚氨酯'],
  ['纸板', '卡纸', '牛皮纸'],
];

function getMaterialGroup(material: string): number {
  for (let i = 0; i < MATERIAL_GROUPS.length; i++) {
    for (const m of MATERIAL_GROUPS[i]) {
      if (material.includes(m) || m.includes(material)) {
        return i;
      }
    }
  }
  return -1;
}

function areMaterialsCompatible(mat1: string, mat2: string): boolean {
  if (mat1 === mat2) return true;
  const g1 = getMaterialGroup(mat1);
  const g2 = getMaterialGroup(mat2);
  return g1 >= 0 && g1 === g2;
}

function parseSpecification(spec: string): { width: number; height: number } {
  if (!spec) return { width: 0, height: 0 };
  const match = spec.match(
    /(\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?)\s*(mm|m)?/i
  );
  if (match) {
    let w = parseFloat(match[1]);
    let h = parseFloat(match[2]);
    const unit = match[3]?.toLowerCase();
    if (unit === 'm') {
      w *= 1000;
      h *= 1000;
    }
    return { width: w, height: h };
  }
  return { width: 0, height: 0 };
}

function deriveShapeType(width: number, height: number, assetType: string): string {
  if (width > 0 && height > 0 && Math.abs(width - height) < 1) {
    return 'square';
  }
  return 'rectangle';
}

export function calculateDieMatchScore(
  die: DieTemplate,
  product: ProductSpec
): DieMatchResult {
  const warnings: string[] = [];
  let sizeMatch = 0;
  let shapeMatch = 0;
  let materialMatch = 0;
  let lifeMatch = 0;

  const tolerance = product.tolerance || 0;
  const productArea = product.width * product.height;
  const dieArea = die.width * die.height;

  if (
    die.width >= product.width - tolerance &&
    die.width <= product.width + tolerance &&
    die.height >= product.height - tolerance &&
    die.height <= product.height + tolerance
  ) {
    sizeMatch = 40;
  } else if (
    die.width >= product.width - tolerance &&
    die.width <= product.width + tolerance * 2 &&
    die.height >= product.height - tolerance &&
    die.height <= product.height + tolerance * 2
  ) {
    sizeMatch = 30;
  } else if (
    die.width >= product.width &&
    die.height >= product.height
  ) {
    if (dieArea > 0) {
      sizeMatch = Math.round(20 * (productArea / dieArea));
    } else {
      sizeMatch = 5;
    }
  } else if (
    die.width >= product.height - tolerance &&
    die.width <= product.height + tolerance &&
    die.height >= product.width - tolerance &&
    die.height <= product.width + tolerance
  ) {
    sizeMatch = 40;
  } else if (
    die.width >= product.height - tolerance &&
    die.width <= product.height + tolerance * 2 &&
    die.height >= product.width - tolerance &&
    die.height <= product.width + tolerance * 2
  ) {
    sizeMatch = 30;
  } else if (
    die.width >= product.height &&
    die.height >= product.width
  ) {
    if (dieArea > 0) {
      sizeMatch = Math.round(20 * (productArea / dieArea));
    } else {
      sizeMatch = 5;
    }
  } else {
    sizeMatch = 0;
  }

  const compatibleShapes = SHAPE_COMPATIBILITY[product.shape_type] || [];
  if (compatibleShapes.includes(die.shape_type)) {
    if (die.shape_type === product.shape_type) {
      shapeMatch = 25;
    } else {
      shapeMatch = 15;
    }
  } else {
    shapeMatch = 0;
  }

  if (die.material_type === product.material_type) {
    materialMatch = 20;
  } else if (areMaterialsCompatible(die.material_type, product.material_type)) {
    materialMatch = 10;
  } else {
    materialMatch = 0;
  }

  if (die.remaining_life > 80) {
    lifeMatch = 15;
  } else if (die.remaining_life > 50) {
    lifeMatch = 10;
  } else if (die.remaining_life > 20) {
    lifeMatch = 5;
  } else {
    lifeMatch = 0;
    if (die.remaining_life > 0) {
      warnings.push('刀模寿命即将耗尽，请尽快安排更换');
    }
  }

  if (die.remaining_life <= 20 && die.remaining_life > 0) {
    warnings.push('刀模剩余寿命低于20%，建议仅用于小批量生产');
  }

  const totalScore = sizeMatch + shapeMatch + materialMatch + lifeMatch;
  const canUse = sizeMatch > 0 && die.remaining_life > 0;

  if (!canUse && sizeMatch === 0) {
    warnings.push('刀模尺寸不满足产品要求');
  }
  if (!canUse && die.remaining_life <= 0) {
    warnings.push('刀模已达到最大使用次数');
  }

  return {
    die_id: die.id,
    die_no: die.template_no,
    die_name: die.name,
    match_score: totalScore,
    match_details: {
      size_match: sizeMatch,
      shape_match: shapeMatch,
      material_match: materialMatch,
      life_match: lifeMatch,
    },
    can_use: canUse,
    warnings,
  };
}

export async function findBestDieMatch(
  conn: any,
  productSpec: ProductSpec,
  limit: number = 5
): Promise<DieMatchResult[]> {
  const [rows]: any = await conn.query(
    `SELECT
      id,
      template_code,
      template_name,
      specification,
      material,
      template_type,
      asset_type,
      max_usage,
      current_usage,
      remaining_usage,
      max_impressions,
      cumulative_impressions,
      status,
      die_status
    FROM prd_die_template
    WHERE deleted = 0 AND status IN (1, 2) AND die_status NOT IN ('scrap')`
  );

  if (!rows || rows.length === 0) {
    return [];
  }

  const [usageRows]: any = await conn.query(
    `SELECT die_id, COUNT(DISTINCT work_order_no) as order_count
    FROM prd_die_usage_log
    WHERE work_order_no IS NOT NULL
    GROUP BY die_id`
  );

  const usageMap = new Map<number, number>();
  if (usageRows) {
    for (const row of usageRows) {
      usageMap.set(row.die_id, row.order_count);
    }
  }

  const results: DieMatchResult[] = [];

  for (const row of rows) {
    const spec = parseSpecification(row.specification || '');
    const maxUses = row.max_impressions || row.max_usage || 0;
    const currentUses = row.cumulative_impressions || row.current_usage || 0;
    const remainingLife =
      maxUses > 0 ? ((maxUses - currentUses) / maxUses) * 100 : 100;

    const die: DieTemplate = {
      id: row.id,
      template_no: row.template_code || '',
      name: row.template_name || '',
      width: spec.width,
      height: spec.height,
      shape_type: deriveShapeType(
        spec.width,
        spec.height,
        row.asset_type
      ),
      material_type: row.material || '',
      max_uses: maxUses,
      current_uses: currentUses,
      remaining_life: Math.max(0, Math.round(remainingLife * 100) / 100),
      status: row.die_status || String(row.status),
      compatible_products: usageMap.has(row.id)
        ? [`${usageMap.get(row.id)}个关联工单`]
        : [],
    };

    const matchResult = calculateDieMatchScore(die, productSpec);
    results.push(matchResult);
  }

  results.sort((a, b) => b.match_score - a.match_score);

  return results.slice(0, limit);
}

export async function predictDieLife(
  conn: any,
  dieId: number
): Promise<{
  current_uses: number;
  max_uses: number;
  remaining_uses: number;
  remaining_life_percent: number;
  estimated_end_date: string;
  usage_trend: 'increasing' | 'stable' | 'decreasing';
}> {
  const [dieRows]: any = await conn.query(
    `SELECT
      id,
      template_code,
      template_name,
      max_usage,
      current_usage,
      remaining_usage,
      max_impressions,
      cumulative_impressions,
      purchase_date,
      create_time
    FROM prd_die_template
    WHERE id = ? AND deleted = 0`,
    [dieId]
  );

  if (!dieRows || dieRows.length === 0) {
    throw new Error(`刀模板不存在: ID=${dieId}`);
  }

  const die = dieRows[0];
  const maxUses = die.max_impressions || die.max_usage || 0;
  const currentUses = die.cumulative_impressions || die.current_usage || 0;
  const remainingUses = Math.max(0, maxUses - currentUses);
  const remainingLifePercent =
    maxUses > 0
      ? Math.round(((maxUses - currentUses) / maxUses) * 10000) / 100
      : 100;

  const [usageLogs]: any = await conn.query(
    `SELECT
      impressions,
      cumulative_after,
      usage_date,
      create_time
    FROM prd_die_usage_log
    WHERE die_id = ?
    ORDER BY usage_date ASC, create_time ASC`,
    [dieId]
  );

  let usageTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
  let avgDailyUsage = 0;

  if (usageLogs && usageLogs.length >= 2) {
    const totalImpressions = usageLogs.reduce(
      (sum: number, log: any) => sum + (parseInt(log.impressions) || 0),
      0
    );

    const firstDate = new Date(usageLogs[0].usage_date || usageLogs[0].create_time);
    const lastDate = new Date(
      usageLogs[usageLogs.length - 1].usage_date ||
        usageLogs[usageLogs.length - 1].create_time
    );
    const totalDays = Math.max(
      1,
      Math.ceil(
        (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    );

    avgDailyUsage = totalImpressions / totalDays;

    if (usageLogs.length >= 6) {
      const midpoint = Math.floor(usageLogs.length / 2);
      const firstHalfImpressions = usageLogs
        .slice(0, midpoint)
        .reduce(
          (sum: number, log: any) => sum + (parseInt(log.impressions) || 0),
          0
        );
      const secondHalfImpressions = usageLogs
        .slice(midpoint)
        .reduce(
          (sum: number, log: any) => sum + (parseInt(log.impressions) || 0),
          0
        );

      const firstHalfAvg = firstHalfImpressions / midpoint;
      const secondHalfAvg = secondHalfImpressions / (usageLogs.length - midpoint);

      if (secondHalfAvg > firstHalfAvg * 1.2) {
        usageTrend = 'increasing';
      } else if (secondHalfAvg < firstHalfAvg * 0.8) {
        usageTrend = 'decreasing';
      } else {
        usageTrend = 'stable';
      }
    } else {
      const monthlyUsage: { month: string; total: number }[] = [];
      for (const log of usageLogs) {
        const d = new Date(log.usage_date || log.create_time);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const existing = monthlyUsage.find((m) => m.month === monthKey);
        if (existing) {
          existing.total += parseInt(log.impressions) || 0;
        } else {
          monthlyUsage.push({ month: monthKey, total: parseInt(log.impressions) || 0 });
        }
      }

      if (monthlyUsage.length >= 2) {
        const firstHalf = monthlyUsage.slice(0, Math.floor(monthlyUsage.length / 2));
        const secondHalf = monthlyUsage.slice(Math.floor(monthlyUsage.length / 2));

        const firstAvg =
          firstHalf.reduce((s, m) => s + m.total, 0) / firstHalf.length;
        const secondAvg =
          secondHalf.reduce((s, m) => s + m.total, 0) / secondHalf.length;

        if (secondAvg > firstAvg * 1.2) {
          usageTrend = 'increasing';
        } else if (secondAvg < firstAvg * 0.8) {
          usageTrend = 'decreasing';
        }
      }
    }
  } else if (usageLogs && usageLogs.length === 1) {
    const log = usageLogs[0];
    const logDate = new Date(log.usage_date || log.create_time);
    const now = new Date();
    const daysSinceUse = Math.max(
      1,
      Math.ceil(
        (now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    );
    avgDailyUsage = (parseInt(log.impressions) || 0) / daysSinceUse;
  }

  let estimatedEndDate = '';
  if (avgDailyUsage > 0 && remainingUses > 0) {
    const daysRemaining = Math.ceil(remainingUses / avgDailyUsage);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysRemaining);
    estimatedEndDate = endDate.toISOString().slice(0, 10);
  } else if (remainingUses <= 0) {
    estimatedEndDate = new Date().toISOString().slice(0, 10);
  } else {
    estimatedEndDate = '';
  }

  return {
    current_uses: currentUses,
    max_uses: maxUses,
    remaining_uses: remainingUses,
    remaining_life_percent: remainingLifePercent,
    estimated_end_date: estimatedEndDate,
    usage_trend: usageTrend,
  };
}
