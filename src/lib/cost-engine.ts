import { query, execute, getConnection } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

export type CostCalculationMethod = 'moving_average' | 'weighted_average' | 'standard_cost';
export type CostElementType = 'material' | 'labor' | 'manufacturing' | 'outsourcing';
export type CostBatchStatus = 'pending' | 'calculating' | 'completed' | 'closed';

export interface CostCalculationInput {
  currentQty: number;
  currentCostPrice: number;
  currentTotalAmount: number;
  inQty: number;
  inPrice: number;
  inAmount?: number;
}

export interface CostCalculationResult {
  newQty: number;
  newCostPrice: number;
  newTotalAmount: number;
  priceChange: number;
  priceChangeRate: number;
}

export interface CostDetailItem {
  materialId: number;
  materialCode: string;
  materialName: string;
  warehouseId?: number;
  beginQty: number;
  beginAmount: number;
  beginPrice: number;
  inQty: number;
  inAmount: number;
  outQty: number;
  outAmount: number;
  endQty: number;
  endAmount: number;
  endPrice: number;
  weightedPrice: number;
}

export interface ProductCostResult {
  productId: number;
  productCode: string;
  productName: string;
  workOrderId?: number;
  bomVersion?: string;
  totalCost: number;
  unitCost: number;
  materialCost: number;
  laborCost: number;
  manufacturingCost: number;
  outsourcingCost: number;
  outputQty: number;
  costLevel: number;
}

export interface VarianceAnalysisResult {
  materialId: number;
  materialCode: string;
  materialName: string;
  standardPrice: number;
  actualPrice: number;
  priceVariance: number;
  priceVarianceRate: number;
  standardQty: number;
  actualQty: number;
  qtyVariance: number;
  qtyVarianceRate: number;
  totalVariance: number;
  totalVarianceRate: number;
}

interface InventoryMaterialCostRow extends RowDataPacket {
  material_id: number;
  material_code: string;
  material_name: string;
  unit: string;
  begin_qty: number;
  begin_amount: number;
  in_qty: number;
  in_amount: number;
  out_qty: number;
  out_amount: number;
}

interface ProductRow extends RowDataPacket {
  id: number;
  material_code: string;
  material_name: string;
  unit: string;
}

interface WorkOrderQtyRow extends RowDataPacket {
  finished_qty: number;
  quantity: number;
}

interface BomLineCostRow extends RowDataPacket {
  material_id: number;
  consumption_qty: number;
  loss_rate: number;
  material_code: string;
  material_name: string;
}

interface InventoryCostPriceRow extends RowDataPacket {
  cost_price: number;
}

interface ProcessLaborRow extends RowDataPacket {
  standard_hours: number;
  work_center_id: number;
  hourly_rate: number;
}

interface ProcessMfgRow extends RowDataPacket {
  machine_hours: number;
  work_center_id: number;
  mfg_hourly_rate: number;
  standard_hours: number;
}

interface OutsourceFeeRow extends RowDataPacket {
  total_fee: number;
}

export class CostEngine {
  private method: CostCalculationMethod;
  private precision: number;

  constructor(method: CostCalculationMethod = 'moving_average', precision: number = 4) {
    this.method = method;
    this.precision = precision;
  }

  calculateMovingAverage(input: CostCalculationInput): CostCalculationResult {
    const { currentQty, currentCostPrice, inQty, inPrice } = input;

    if (inQty <= 0) {
      throw new Error('入库数量必须大于0');
    }
    if (inPrice < 0) {
      throw new Error('入库单价不能为负');
    }
    if (currentQty < 0) {
      throw new Error('当前库存数量不能为负');
    }
    if (currentCostPrice < 0) {
      throw new Error('当前成本单价不能为负');
    }

    const currentAmount = input.currentTotalAmount || currentQty * currentCostPrice;
    const inAmount = input.inAmount || inQty * inPrice;

    const newQty = currentQty + inQty;
    const newTotalAmount = currentAmount + inAmount;
    const newCostPrice = newQty > 0 ? newTotalAmount / newQty : 0;

    const priceChange = newCostPrice - currentCostPrice;
    const priceChangeRate = currentCostPrice > 0 ? priceChange / currentCostPrice : 0;

    return {
      newQty: this.round(newQty),
      newCostPrice: this.roundPrice(newCostPrice),
      newTotalAmount: this.roundAmount(newTotalAmount),
      priceChange: this.roundPrice(priceChange),
      priceChangeRate: this.roundPrice(priceChangeRate),
    };
  }

  calculateWeightedAverage(
    beginQty: number,
    beginAmount: number,
    inQty: number,
    inAmount: number
  ): { weightedPrice: number; endQty: number; endAmount: number } {
    const totalQty = beginQty + inQty;
    const totalAmount = beginAmount + inAmount;
    const weightedPrice = totalQty > 0 ? totalAmount / totalQty : 0;

    return {
      weightedPrice: this.roundPrice(weightedPrice),
      endQty: this.round(totalQty),
      endAmount: this.roundAmount(totalAmount),
    };
  }

  calculateIssueCost(qty: number, unitPrice: number): number {
    if (qty < 0) {
      throw new Error('出库数量不能为负');
    }
    if (unitPrice < 0) {
      throw new Error('单位成本不能为负');
    }
    return this.roundAmount(qty * unitPrice);
  }

  calculateStandardVariance(
    standardPrice: number,
    actualPrice: number,
    standardQty: number,
    actualQty: number
  ): VarianceAnalysisResult & { materialId: number } {
    const totalStandardCost = standardPrice * standardQty;
    const totalActualCost = actualPrice * actualQty;
    const totalVariance = totalActualCost - totalStandardCost;

    const priceVariance = (actualPrice - standardPrice) * actualQty;
    const qtyVariance = (actualQty - standardQty) * standardPrice;

    const priceVarianceRate = standardPrice > 0 ? priceVariance / totalStandardCost : 0;
    const qtyVarianceRate = standardQty > 0 ? qtyVariance / totalStandardCost : 0;
    const totalVarianceRate = totalStandardCost > 0 ? totalVariance / totalStandardCost : 0;

    return {
      materialId: 0,
      materialCode: '',
      materialName: '',
      standardPrice: this.roundPrice(standardPrice),
      actualPrice: this.roundPrice(actualPrice),
      priceVariance: this.roundAmount(priceVariance),
      priceVarianceRate: this.roundPrice(priceVarianceRate),
      standardQty: this.round(standardQty),
      actualQty: this.round(actualQty),
      qtyVariance: this.roundAmount(qtyVariance),
      qtyVarianceRate: this.roundPrice(qtyVarianceRate),
      totalVariance: this.roundAmount(totalVariance),
      totalVarianceRate: this.roundPrice(totalVarianceRate),
    };
  }

  async calculateMonthEndWeightedAverage(
    period: string,
    warehouseId?: number
  ): Promise<CostDetailItem[]> {
    const conn = await getConnection();
    try {
      const [year, month] = period.split('-').map(Number);
      const startDate = `${period}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${period}-${lastDay}`;

      const sql = `
        SELECT 
          im.id as material_id,
          im.material_code,
          im.material_name,
          im.unit,
          COALESCE(begin_qty, 0) as begin_qty,
          COALESCE(begin_amount, 0) as begin_amount,
          COALESCE(in_qty, 0) as in_qty,
          COALESCE(in_amount, 0) as in_amount,
          COALESCE(out_qty, 0) as out_qty,
          COALESCE(out_amount, 0) as out_amount
        FROM inv_material im
        LEFT JOIN (
          SELECT material_id,
                 SUM(CASE WHEN type = 'begin' THEN qty ELSE 0 END) as begin_qty,
                 SUM(CASE WHEN type = 'begin' THEN amount ELSE 0 END) as begin_amount,
                 SUM(CASE WHEN type = 'in' THEN qty ELSE 0 END) as in_qty,
                 SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END) as in_amount,
                 SUM(CASE WHEN type = 'out' THEN qty ELSE 0 END) as out_qty,
                 SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END) as out_amount
          FROM (
            SELECT material_id, qty, amount, 'in' as type
            FROM wh_inventory_log
            WHERE trans_type IN ('purchase_in', 'production_in', 'other_in', 'transfer_in')
              AND trans_date BETWEEN ? AND ?
              ${warehouseId ? 'AND warehouse_id = ?' : ''}
              AND deleted = 0
            UNION ALL
            SELECT material_id, -qty as qty, -amount as amount, 'out' as type
            FROM wh_inventory_log
            WHERE trans_type IN ('sales_out', 'production_out', 'other_out', 'transfer_out')
              AND trans_date BETWEEN ? AND ?
              ${warehouseId ? 'AND warehouse_id = ?' : ''}
              AND deleted = 0
          ) t
          GROUP BY material_id
        ) stats ON stats.material_id = im.id
        WHERE im.deleted = 0
        ORDER BY im.material_code
      `;

      const params: (string | number)[] = [startDate, endDate];
      if (warehouseId) params.push(warehouseId);
      params.push(startDate, endDate);
      if (warehouseId) params.push(warehouseId);

      const [rows] = await conn.query<InventoryMaterialCostRow[]>(sql, params);

      const results: CostDetailItem[] = [];
      for (const row of rows) {
        const beginQty = Number(row.begin_qty || 0);
        const beginAmount = Number(row.begin_amount || 0);
        const inQty = Number(row.in_qty || 0);
        const inAmount = Number(row.in_amount || 0);
        const outQty = Number(row.out_qty || 0);

        const waResult = this.calculateWeightedAverage(beginQty, beginAmount, inQty, inAmount);
        const outAmount = this.calculateIssueCost(outQty, waResult.weightedPrice);
        const endQty = beginQty + inQty - outQty;
        const endAmount = beginAmount + inAmount - outAmount;

        results.push({
          materialId: Number(row.material_id),
          materialCode: row.material_code || '',
          materialName: row.material_name || '',
          warehouseId,
          beginQty: this.round(beginQty),
          beginAmount: this.roundAmount(beginAmount),
          beginPrice: beginQty > 0 ? this.roundPrice(beginAmount / beginQty) : 0,
          inQty: this.round(inQty),
          inAmount: this.roundAmount(inAmount),
          outQty: this.round(outQty),
          outAmount: this.roundAmount(outAmount),
          endQty: this.round(endQty),
          endAmount: this.roundAmount(endAmount),
          endPrice: endQty > 0 ? this.roundPrice(endAmount / endQty) : 0,
          weightedPrice: waResult.weightedPrice,
        });
      }

      return results;
    } finally {
      if (conn && conn.release) conn.release();
    }
  }

  async convolveProductCost(
    productId: number,
    period: string,
    workOrderId?: number
  ): Promise<ProductCostResult> {
    const conn = await getConnection();
    try {
      const [productRows] = await conn.query<ProductRow[]>(
        `SELECT id, material_code, material_name, unit 
         FROM inv_material 
         WHERE id = ? AND deleted = 0`,
        [productId]
      );

      if (productRows.length === 0) {
        throw new Error(`产品ID ${productId} 不存在`);
      }

      const product = productRows[0];

      const materialCost = await this.calculateMaterialCost(conn, productId, period, workOrderId);
      const laborCost = await this.calculateLaborCost(conn, productId, period, workOrderId);
      const manufacturingCost = await this.calculateManufacturingCost(
        conn,
        productId,
        period,
        workOrderId
      );
      const outsourcingCost = await this.calculateOutsourcingCost(
        conn,
        productId,
        period,
        workOrderId
      );

      let outputQty = 0;
      if (workOrderId) {
        const [woRows] = await conn.query<WorkOrderQtyRow[]>(
          `SELECT finished_qty, quantity FROM prod_work_order WHERE id = ?`,
          [workOrderId]
        );
        if (woRows.length > 0) {
          outputQty = Number(woRows[0].finished_qty || woRows[0].quantity || 0);
        }
      }

      const totalCost = materialCost + laborCost + manufacturingCost + outsourcingCost;
      const unitCost = outputQty > 0 ? totalCost / outputQty : 0;

      return {
        productId,
        productCode: product.material_code || '',
        productName: product.material_name || '',
        workOrderId,
        totalCost: this.roundAmount(totalCost),
        unitCost: this.roundPrice(unitCost),
        materialCost: this.roundAmount(materialCost),
        laborCost: this.roundAmount(laborCost),
        manufacturingCost: this.roundAmount(manufacturingCost),
        outsourcingCost: this.roundAmount(outsourcingCost),
        outputQty: this.round(outputQty),
        costLevel: 0,
      };
    } finally {
      if (conn && conn.release) conn.release();
    }
  }

  private async calculateMaterialCost(
    conn: PoolConnection,
    productId: number,
    period: string,
    workOrderId?: number
  ): Promise<number> {
    let totalMaterialCost = 0;

    const [bomRows] = await conn.query<BomLineCostRow[]>(
      `SELECT bl.material_id, bl.consumption_qty, bl.loss_rate,
              im.material_code, im.material_name
       FROM bom_header bh
       INNER JOIN bom_line bl ON bl.bom_id = bh.id
       INNER JOIN inv_material im ON im.id = bl.material_id
       WHERE bh.product_id = ? 
         AND bh.status = 30 
         AND bh.deleted = 0
         AND bl.deleted = 0
       ORDER BY bh.is_default DESC, bh.version DESC
       LIMIT 100`,
      [productId]
    );

    for (const bom of bomRows) {
      const materialId = Number(bom.material_id);
      const consumptionQty = Number(bom.consumption_qty || 0);
      const lossRate = Number(bom.loss_rate || 0) / 100;

      const [costRows] = await conn.query<InventoryCostPriceRow[]>(
        `SELECT cost_price FROM wh_inventory 
         WHERE material_id = ? AND deleted = 0
         LIMIT 1`,
        [materialId]
      );

      let unitCost = 0;
      if (costRows.length > 0) {
        unitCost = Number(costRows[0].cost_price || 0);
      }

      const grossQty = consumptionQty * (1 + lossRate);
      totalMaterialCost += grossQty * unitCost;
    }

    return totalMaterialCost;
  }

  private async calculateLaborCost(
    conn: PoolConnection,
    productId: number,
    period: string,
    workOrderId?: number
  ): Promise<number> {
    let totalLaborCost = 0;

    const [processRows] = await conn.query<ProcessLaborRow[]>(
      `SELECT pr.standard_hours, pr.work_center_id, wc.hourly_rate
       FROM pro_process_route pr
       LEFT JOIN pro_work_center wc ON wc.id = pr.work_center_id
       WHERE pr.product_id = ? AND pr.status = 1
       ORDER BY pr.seq_no`,
      [productId]
    );

    for (const proc of processRows) {
      const standardHours = Number(proc.standard_hours || 0);
      const hourlyRate = Number(proc.hourly_rate || 0);
      totalLaborCost += standardHours * hourlyRate;
    }

    return totalLaborCost;
  }

  private async calculateManufacturingCost(
    conn: PoolConnection,
    productId: number,
    period: string,
    workOrderId?: number
  ): Promise<number> {
    let totalMfgCost = 0;

    const [processRows] = await conn.query<ProcessMfgRow[]>(
      `SELECT pr.machine_hours, pr.work_center_id, wc.mfg_hourly_rate
       FROM pro_process_route pr
       LEFT JOIN pro_work_center wc ON wc.id = pr.work_center_id
       WHERE pr.product_id = ? AND pr.status = 1
       ORDER BY pr.seq_no`,
      [productId]
    );

    for (const proc of processRows) {
      const machineHours = Number(proc.machine_hours || proc.standard_hours || 0);
      const mfgRate = Number(proc.mfg_hourly_rate || 0);
      totalMfgCost += machineHours * mfgRate;
    }

    return totalMfgCost;
  }

  private async calculateOutsourcingCost(
    conn: PoolConnection,
    productId: number,
    period: string,
    workOrderId?: number
  ): Promise<number> {
    if (!workOrderId) return 0;

    const [rows] = await conn.query<OutsourceFeeRow[]>(
      `SELECT COALESCE(SUM(os.process_fee), 0) as total_fee
       FROM outsource_order oo
       INNER JOIN outsource_order_line ol ON ol.outsource_order_id = oo.id
       WHERE oo.work_order_id = ? AND oo.deleted = 0 AND oo.status >= 30`,
      [workOrderId]
    );

    return rows.length > 0 ? Number(rows[0].total_fee || 0) : 0;
  }

  private round(v: number): number {
    const factor = Math.pow(10, this.precision);
    return Math.round(v * factor) / factor;
  }

  private roundPrice(v: number): number {
    return Math.round(v * 10000) / 10000;
  }

  private roundAmount(v: number): number {
    return Math.round(v * 100) / 100;
  }
}

export function calculateEOQ(
  annualDemand: number,
  orderingCost: number,
  holdingCost: number
): number {
  if (annualDemand <= 0 || orderingCost <= 0 || holdingCost <= 0) {
    return 0;
  }
  return Math.sqrt((2 * annualDemand * orderingCost) / holdingCost);
}

export default CostEngine;
