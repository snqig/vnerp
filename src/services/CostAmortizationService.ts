import { query, execute } from '@/lib/db';
import { secureLog } from '@/lib/logger';

export interface CostAmortizationParams {
  sourceType: 'ink' | 'screen_plate';
  sourceId: number;
  sourceCode: string;
  purchasePrice: number;
  initialQuantity: number;
  usageQuantity: number;
  maxLifeCount?: number;
}

export interface AmortizationResult {
  sourceId: number;
  sourceCode: string;
  totalCost: number;
  unitCost: number;
  remainingValue: number;
  amortizationRate: number;
}

export interface CostAllocationParams {
  workOrderId: number;
  workOrderNo: string;
  costType: 'ink' | 'screen_plate' | 'material' | 'labor' | 'overhead';
  sourceId: number;
  sourceCode: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export class CostAmortizationService {
  async calculateAmortization(params: CostAmortizationParams): Promise<AmortizationResult> {
    const {
      sourceType,
      sourceId,
      sourceCode,
      purchasePrice,
      initialQuantity,
      usageQuantity,
      maxLifeCount,
    } = params;

    const totalCost = purchasePrice;
    const remainingQuantity = initialQuantity - usageQuantity;

    let unitCost: number;
    let remainingValue: number;
    let amortizationRate: number;

    if (sourceType === 'ink') {
      // 油墨成本：按使用量计算
      unitCost = purchasePrice / initialQuantity;
      remainingValue = unitCost * remainingQuantity;
      amortizationRate = usageQuantity / initialQuantity;
    } else {
      // 网版成本：按使用次数摊销
      const maxCount = maxLifeCount || 1000;
      const usageRatio = usageQuantity / maxCount;
      unitCost = purchasePrice / maxCount;
      remainingValue = purchasePrice * (1 - usageRatio);
      amortizationRate = usageRatio;
    }

    return {
      sourceId,
      sourceCode,
      totalCost: Math.round(totalCost * 100) / 100,
      unitCost: Math.round(unitCost * 100) / 100,
      remainingValue: Math.round(remainingValue * 100) / 100,
      amortizationRate: Math.round(amortizationRate * 10000) / 100,
    };
  }

  async recordAmortization(
    workOrderId: number,
    workOrderNo: string,
    params: CostAllocationParams[]
  ): Promise<void> {
    const transNo = `AMORT-${Date.now()}`;

    for (const param of params) {
      const { costType, sourceId, sourceCode, quantity, unitCost, totalCost } = param;

      const accountDr = this.getCostAccountDr(costType);
      const accountCr = this.getCostAccountCr(costType);

      await execute(
        `INSERT INTO inv_inventory_transaction (
          trans_no, trans_type, source_type, source_id,
          material_id, material_code, material_name,
          quantity, unit_price, total_amount,
          account_dr, account_cr,
          operator_id, operator_name,
          remark, create_time
        ) VALUES (?, 'out', 'workorder', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          `${transNo}-${sourceId}`,
          workOrderId,
          sourceId,
          sourceCode,
          costType,
          quantity,
          unitCost,
          totalCost,
          accountDr,
          accountCr,
          null,
          'system',
          `工单 ${workOrderNo} ${this.getCostTypeName(costType)}成本`,
        ]
      );
    }

    secureLog('info', 'Cost amortization recorded', {
      workOrderNo,
      itemCount: params.length,
      totalCost: params.reduce((sum, p) => sum + p.totalCost, 0),
    });
  }

  private getCostAccountDr(costType: string): string {
    const accountMap: Record<string, string> = {
      ink: '6401', // 制造费用-油墨
      screen_plate: '6402', // 制造费用-网版摊销
      material: '5001', // 生产成本-直接材料
      labor: '5002', // 生产成本-直接人工
      overhead: '5003', // 生产成本-制造费用
    };
    return accountMap[costType] || '6403';
  }

  private getCostAccountCr(costType: string): string {
    const accountMap: Record<string, string> = {
      ink: '1301', // 原材料
      screen_plate: '1801', // 长期待摊费用
      material: '1301', // 原材料
      labor: '2101', // 应付职工薪酬
      overhead: '5101', // 制造费用
    };
    return accountMap[costType] || '1301';
  }

  private getCostTypeName(costType: string): string {
    const nameMap: Record<string, string> = {
      ink: '油墨',
      screen_plate: '网版',
      material: '材料',
      labor: '人工',
      overhead: '制造费用',
    };
    return nameMap[costType] || costType;
  }

  async getWorkOrderCostSummary(workOrderId: number): Promise<{
    materialCost: number;
    laborCost: number;
    manufacturingCost: number;
    totalCost: number;
    unitCost: number;
  }> {
    const rows: any[] = (await query(
      `SELECT 
        COALESCE(material_cost, 0) as material_cost,
        COALESCE(labor_cost, 0) as labor_cost,
        COALESCE(manufacturing_cost, 0) as manufacturing_cost,
        COALESCE(total_cost, 0) as total_cost,
        COALESCE(unit_cost, 0) as unit_cost
       FROM work_order_costs
       WHERE work_order_id = ?`,
      [workOrderId]
    )) as any[];

    if (rows.length > 0) {
      const row = rows[0];
      return {
        materialCost: parseFloat(row.material_cost),
        laborCost: parseFloat(row.labor_cost),
        manufacturingCost: parseFloat(row.manufacturing_cost),
        totalCost: parseFloat(row.total_cost),
        unitCost: parseFloat(row.unit_cost),
      };
    }

    return {
      materialCost: 0,
      laborCost: 0,
      manufacturingCost: 0,
      totalCost: 0,
      unitCost: 0,
    };
  }

  async calculateAndAllocateWorkOrderCost(
    workOrderId: number,
    workOrderNo: string,
    completedQty: number
  ): Promise<{
    allocations: CostAllocationParams[];
    totalCost: number;
    unitCost: number;
  }> {
    const allocations: CostAllocationParams[] = [];

    // 获取材料成本
    const materialRows: any[] = (await query(
      `SELECT 
        m.id, m.material_code, SUM(wm.required_qty) as total_qty, 
        m.cost_price, m.unit
       FROM prod_work_order_material_req wm
       LEFT JOIN bas_material m ON wm.material_id = m.id
       WHERE wm.work_order_id = ?
       GROUP BY m.id`,
      [workOrderId]
    )) as any[];

    for (const row of materialRows) {
      const qty = parseFloat(row.total_qty || 0);
      const unitCost = parseFloat(row.cost_price || 0);
      const totalCost = qty * unitCost;

      allocations.push({
        workOrderId,
        workOrderNo,
        costType: 'material',
        sourceId: row.id,
        sourceCode: row.material_code,
        quantity: qty,
        unitCost,
        totalCost: Math.round(totalCost * 100) / 100,
      });
    }

    // 获取油墨成本
    const inkRows: any[] = (await query(
      `SELECT 
        bi.id, bi.ink_code, SUM(iu.usage_qty) as total_qty,
        bi.unit_price
       FROM ink_usage iu
       LEFT JOIN base_ink bi ON iu.ink_id = bi.id
       WHERE iu.work_order_id = ?
       GROUP BY bi.id`,
      [workOrderId]
    )) as any[];

    for (const row of inkRows) {
      const qty = parseFloat(row.total_qty || 0);
      const unitCost = parseFloat(row.unit_price || 0);
      const totalCost = qty * unitCost;

      allocations.push({
        workOrderId,
        workOrderNo,
        costType: 'ink',
        sourceId: row.id,
        sourceCode: row.ink_code,
        quantity: qty,
        unitCost,
        totalCost: Math.round(totalCost * 100) / 100,
      });
    }

    const totalCost = allocations.reduce((sum, a) => sum + a.totalCost, 0);
    const unitCost = completedQty > 0 ? totalCost / completedQty : 0;

    return {
      allocations,
      totalCost: Math.round(totalCost * 100) / 100,
      unitCost: Math.round(unitCost * 100) / 100,
    };
  }
}
