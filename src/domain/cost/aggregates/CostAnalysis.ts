export enum CostType {
  DIRECT_MATERIAL = 'direct_material',
  DIRECT_LABOR = 'direct_labor',
  MANUFACTURING_OVERHEAD = 'mfg_overhead',
  SELLING_EXPENSE = 'selling_expense',
  ADMIN_EXPENSE = 'admin_expense',
}

export class CostAnalysis {
  static calculateProductCost(params: {
    materialCost: number;
    laborHours: number;
    laborRatePerHour: number;
    machineTimes: { machineId: number; hours: number }[];
    machineOverheadRates: Map<number, number>;
    batchSize: number;
  }): {
    directMaterial: number;
    directLabor: number;
    manufacturing: number;
    totalCost: number;
    unitCost: number;
  } {
    const directMaterial = params.materialCost;
    const directLabor = params.laborHours * params.laborRatePerHour;
    let manufacturing = 0;
    for (const { machineId, hours } of params.machineTimes) {
      manufacturing += hours * (params.machineOverheadRates.get(machineId) || 0);
    }
    const totalCost = directMaterial + directLabor + manufacturing;
    const unitCost = totalCost / params.batchSize;
    return { directMaterial, directLabor, manufacturing, totalCost, unitCost };
  }

  static analyzeProductProfitability(
    products: {
      productId: number;
      revenue: number;
      directCost: number;
      overheadAllocation: number;
    }[]
  ): Array<{
    productId: number;
    revenue: number;
    directCost: number;
    overhead: number;
    grossProfit: number;
    grossMargin: number;
    netProfit: number;
    netMargin: number;
  }> {
    const totalOverhead = products.reduce((sum, p) => sum + p.overheadAllocation, 0);
    const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0);
    const overheadRate = totalRevenue > 0 ? totalOverhead / totalRevenue : 0;
    return products.map((p) => ({
      productId: p.productId,
      revenue: p.revenue,
      directCost: p.directCost,
      overhead: p.overheadAllocation,
      grossProfit: p.revenue - p.directCost,
      grossMargin: p.revenue > 0 ? ((p.revenue - p.directCost) / p.revenue) * 100 : 0,
      netProfit: p.revenue - p.directCost - p.overheadAllocation,
      netMargin:
        p.revenue > 0 ? ((p.revenue - p.directCost - p.overheadAllocation) / p.revenue) * 100 : 0,
    }));
  }

  static classifyInventory(inventory: { materialId: number; value: number }[]): {
    A: number[];
    B: number[];
    C: number[];
  } {
    const sorted = [...inventory].sort((a, b) => b.value - a.value);
    const totalValue = sorted.reduce((sum, i) => sum + i.value, 0);
    const result: { A: number[]; B: number[]; C: number[] } = { A: [], B: [], C: [] };
    let cumValue = 0;
    for (const item of sorted) {
      cumValue += item.value;
      const cumPercent = (cumValue / totalValue) * 100;
      if (cumPercent <= 80) result.A.push(item.materialId);
      else if (cumPercent <= 95) result.B.push(item.materialId);
      else result.C.push(item.materialId);
    }
    return result;
  }

  static calculateBreakEvenPoint(params: {
    fixedCost: number;
    variableCostPerUnit: number;
    sellingPrice: number;
  }): { bepQuantity: number; bepRevenue: number; safetyMargin: number } {
    const contribution = params.sellingPrice - params.variableCostPerUnit;
    if (contribution <= 0) throw new Error('销售价格必须高于单位变动成本');
    const bepQuantity = params.fixedCost / contribution;
    return {
      bepQuantity: Math.ceil(bepQuantity),
      bepRevenue: Math.ceil(bepQuantity * params.sellingPrice),
      safetyMargin:
        ((params.sellingPrice - params.variableCostPerUnit) / params.sellingPrice) * 100,
    };
  }
}
