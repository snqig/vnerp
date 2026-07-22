/**
 * @module 成本引擎 (Cost Engine)
 * @description 该模块提供生产成本核算核心功能，包括移动加权平均法、全月一次加权平均法、
 * 标准成本差异分析等成本计算方法，以及产品成本卷积（BOM 材料成本 + 人工成本 + 制造费用 + 委外费用）核算。
 */
import { getConnection } from '@/lib/db';
import {
  roundTo as roundToUtil,
  roundPrice as roundPriceUtil,
  roundAmount as roundAmountUtil,
} from '@/lib/decimal-utils';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

/** 成本计算方法：移动加权平均、全月加权平均、标准成本 */
export type CostCalculationMethod = 'moving_average' | 'weighted_average' | 'standard_cost';

/** 成本要素类型：材料、人工、制造费用、委外加工 */
export type CostElementType = 'material' | 'labor' | 'manufacturing' | 'outsourcing';

/** 成本计算批次状态：待计算、计算中、已完成、已关闭 */
export type CostBatchStatus = 'pending' | 'calculating' | 'completed' | 'closed';

/**
 * 成本计算的输入参数（用于移动加权平均计算）
 */
export interface CostCalculationInput {
  currentQty: number;
  currentCostPrice: number;
  currentTotalAmount: number;
  inQty: number;
  inPrice: number;
  inAmount?: number;
}

/**
 * 成本计算的结果（移动加权平均计算输出）
 */
export interface CostCalculationResult {
  newQty: number;
  newCostPrice: number;
  newTotalAmount: number;
  priceChange: number;
  priceChangeRate: number;
}

/**
 * 表示物料的成本明细项（用于月末加权平均成本核算）
 */
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

/**
 * 表示产品成本核算结果
 */
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

/**
 * 表示标准成本差异分析结果
 *
 * 包含价格差异和数量差异两个维度的分析数据。
 */
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

/**
 * 成本核算引擎类
 *
 * 支持多种成本计算方法（移动加权平均、全月加权平均、标准成本），
 * 提供出入库成本计算、标准成本差异分析、月末加权平均成本核算，
 * 以及产品成本卷积（材料 + 人工 + 制造费用 + 委外）等功能。
 */
export class CostEngine {
  private method: CostCalculationMethod;
  private precision: number;

  /**
   * 创建成本引擎实例
   *
   * @param method - 成本计算方法，默认为移动加权平均法
   * @param precision - 数量精度（小数位数），默认为 4 位
   */
  constructor(method: CostCalculationMethod = 'moving_average', precision: number = 4) {
    this.method = method;
    this.precision = precision;
  }

  /**
   * 计算移动加权平均成本
   *
   * 每次入库时即时重新计算库存平均成本，公式如下：
   * - 新数量 = 当前数量 + 入库数量
   * - 新总金额 = 当前总金额 + 入库金额
   * - 新成本单价 = 新总金额 / 新数量（数量为 0 时单价为 0）
   * - 价格变动 = 新成本单价 - 当前成本单价
   * - 价格变动率 = 价格变动 / 当前成本单价（当前单价为 0 时变动率为 0）
   *
   * @param input - 成本计算输入参数
   * @returns 成本计算结果，包含新数量、新单价、新总金额及价格变动信息
   * @throws {Error} 当入库数量 ≤ 0 时抛出"入库数量必须大于0"
   * @throws {Error} 当入库单价 < 0 时抛出"入库单价不能为负"
   * @throws {Error} 当当前库存数量 < 0 时抛出"当前库存数量不能为负"
   * @throws {Error} 当当前成本单价 < 0 时抛出"当前成本单价不能为负"
   */
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

  /**
   * 计算全月一次加权平均成本
   *
   * 以期初结存数量和金额加上本期全部入库数量和金额，计算加权平均单价，公式如下：
   * - 加权平均单价 = (期初金额 + 入库金额) / (期初数量 + 入库数量)
   * - 期末数量 = 期初数量 + 入库数量
   * - 期末金额 = 期初金额 + 入库金额
   *
   * @param beginQty - 期初数量
   * @param beginAmount - 期初金额
   * @param inQty - 本期入库数量
   * @param inAmount - 本期入库金额
   * @returns 包含加权平均单价、期末数量和期末金额的对象
   */
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

  /**
   * 计算出库成本
   *
   * 出库成本 = 出库数量 × 单位成本
   *
   * @param qty - 出库数量
   * @param unitPrice - 单位成本
   * @returns 出库总成本金额（四舍五入到两位小数）
   * @throws {Error} 当出库数量 < 0 时抛出"出库数量不能为负"
   * @throws {Error} 当单位成本 < 0 时抛出"单位成本不能为负"
   */
  calculateIssueCost(qty: number, unitPrice: number): number {
    if (qty < 0) {
      throw new Error('出库数量不能为负');
    }
    if (unitPrice < 0) {
      throw new Error('单位成本不能为负');
    }
    return this.roundAmount(qty * unitPrice);
  }

  /**
   * 计算标准成本差异分析
   *
   * 将实际成本与标准成本进行对比，分解为价格差异和数量差异，公式如下：
   * - 价格差异 = (实际单价 - 标准单价) × 实际数量
   * - 数量差异 = (实际数量 - 标准数量) × 标准单价
   * - 总差异 = 实际总成本 - 标准总成本 = 价格差异 + 数量差异
   * - 各差异率 = 对应差异 / 标准总成本（标准总成本为 0 时差异率为 0）
   *
   * @param standardPrice - 标准单价
   * @param actualPrice - 实际单价
   * @param standardQty - 标准数量
   * @param actualQty - 实际数量
   * @returns 差异分析结果，包含价格差异、数量差异及总差异的绝对值和比率
   */
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

  /**
   * 计算月末全月加权平均成本明细
   *
   * 查询指定期间内所有物料的期初、入库、出库数据，使用全月一次加权平均法
   * 计算每个物料的加权平均单价，并据此计算发出成本和期末结存。
   *
   * 计算流程：
   * 1. 汇总期间内各物料的期初、入库、出库数量和金额
   * 2. 加权平均单价 = (期初金额 + 入库金额) / (期初数量 + 入库数量)
   * 3. 出库成本 = 出库数量 × 加权平均单价
   * 4. 期末数量 = 期初数量 + 入库数量 - 出库数量
   * 5. 期末金额 = 期初金额 + 入库金额 - 出库成本
   *
   * @param period - 会计期间，格式为 "YYYY-MM"
   * @param warehouseId - 可选的仓库 ID，用于筛选特定仓库的数据
   * @returns 各物料的成本明细数组
   */
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

  /**
   * 卷积计算产品总成本
   *
   * 通过 BOM 和工艺路线，将材料成本、人工成本、制造费用和委外加工费
   * 逐层汇总计算产品总成本和单位成本。
   *
   * 成本构成：
   * - 材料成本：BOM 中各子件用量 × (1 + 损耗率) × 库存成本单价
   * - 人工成本：各工序标准工时 × 工作中心小时费率
   * - 制造费用：各工序机时（或标准工时） × 工作中心制造费用小时费率
   * - 委外费用：关联工单的委外订单加工费合计
   * - 单位成本 = 总成本 / 完工数量（完工数量为 0 时单位成本为 0）
   *
   * @param productId - 产品（物料）ID
   * @param period - 会计期间，格式为 "YYYY-MM"
   * @param workOrderId - 可选的工单 ID，用于核算特定工单成本
   * @returns 产品成本核算结果
   * @throws {Error} 当产品 ID 不存在时抛出"产品ID {id} 不存在"
   */
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

  /**
   * 计算产品材料成本
   *
   * 根据产品 BOM 明细，查询各子件库存成本单价并计算材料成本。
   * 计算公式：材料成本 = Σ(子件用量 × (1 + 损耗率) × 子件库存成本单价)
   *
   * @param conn - 数据库连接
   * @param productId - 产品 ID
   * @param period - 会计期间
   * @param workOrderId - 可选的工单 ID
   * @returns 材料成本合计金额
   */
  private async calculateMaterialCost(
    conn: PoolConnection,
    productId: number,
    _period: string,
    _workOrderId?: number
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

  /**
   * 计算产品人工成本
   *
   * 根据产品工艺路线中各工序的标准工时和工作中心小时费率计算人工成本。
   * 计算公式：人工成本 = Σ(工序标准工时 × 工作中心小时费率)
   *
   * @param conn - 数据库连接
   * @param productId - 产品 ID
   * @param period - 会计期间
   * @param workOrderId - 可选的工单 ID
   * @returns 人工成本合计金额
   */
  private async calculateLaborCost(
    conn: PoolConnection,
    productId: number,
    _period: string,
    _workOrderId?: number
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

  /**
   * 计算产品制造费用
   *
   * 根据产品工艺路线中各工序的机时（或标准工时）和工作中心制造费用小时费率计算制造费用。
   * 计算公式：制造费用 = Σ(工序机时 × 工作中心制造费用小时费率)
   * 注：当机时为空时使用标准工时作为替代。
   *
   * @param conn - 数据库连接
   * @param productId - 产品 ID
   * @param period - 会计期间
   * @param workOrderId - 可选的工单 ID
   * @returns 制造费用合计金额
   */
  private async calculateManufacturingCost(
    conn: PoolConnection,
    productId: number,
    _period: string,
    _workOrderId?: number
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

  /**
   * 计算产品委外加工费用
   *
   * 查询关联工单的委外订单明细，汇总所有已确认（status >= 30）的委外加工费。
   * 若未提供工单 ID，则返回 0。
   *
   * @param conn - 数据库连接
   * @param productId - 产品 ID
   * @param period - 会计期间
   * @param workOrderId - 工单 ID（可选，未提供时返回 0）
   * @returns 委外加工费合计金额
   */
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

  /**
   * 数量四舍五入到指定精度
   *
   * @param v - 原始数值
   * @returns 按构造函数指定精度四舍五入后的数值
   */
  private round(v: number): number {
    return roundToUtil(v, this.precision);
  }

  /**
   * 单价四舍五入到四位小数 — Decimal.js 精度
   */
  private roundPrice(v: number): number {
    return roundPriceUtil(v);
  }

  /**
   * 金额四舍五入到两位小数（分）— Decimal.js 精度
   */
  private roundAmount(v: number): number {
    return roundAmountUtil(v);
  }
}

/**
 * 计算经济订货批量（EOQ, Economic Order Quantity）
 *
 * 使用经典 EOQ 模型公式确定最优订货量，使订货成本与持有成本之和最小：
 * EOQ = √(2 × 年需求量 × 每次订货成本 / 单位年持有成本)
 *
 * @param annualDemand - 年度需求量
 * @param orderingCost - 每次订货成本
 * @param holdingCost - 单位年度持有成本
 * @returns 经济订货批量，当任一参数 ≤ 0 时返回 0
 *
 * @example
 * const eoq = calculateEOQ(10000, 100, 2);
 * // 返回 1000
 */
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

/**
 * 成本引擎类的默认导出
 */
export default CostEngine;
