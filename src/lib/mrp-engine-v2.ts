/**
 * @module MRP 引擎 V2
 * @description MRP（物料需求计划）引擎的第二代实现。相比 V1 版本，V2 采用面向对象设计，
 * 支持净变更运行、多层次需求展开、安全库存策略配置、批量化规则（lot-for-lot/固定批量/EOQ/周期供应）、
 * 替代物料、产能负荷分析以及完整的供需时间分段计算。该模块是 ERP 系统中生产计划与物料控制
 * 的高级计算组件，提供更加灵活和精细化的物料供需平衡分析能力。
 */

import { getConnection } from '@/lib/db';
import { generateDocumentNo } from '@/lib/document-numbering';
import { secureLog } from '@/lib/logger';
import { CalcParamService } from '@/lib/calc-param-service';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

/** 批量化策略类型 */
export type LotSizingType = 'lot_for_lot' | 'fixed' | 'eoq' | 'period_supply';
/** 时间分段粒度 */
export type BucketSize = 'day' | 'week' | 'month';
/** MRP 行动计划类型：生产/采购/调拨 */
export type MRPActionType = 'produce' | 'purchase' | 'transfer';
/** MRP 运行状态 */
export type MRPStatus = 'calculating' | 'completed' | 'confirmed' | 'cancelled';

/**
 * MRP 运行全局配置参数
 */
export interface MRPConfig {
  horizonDays: number;
  bucketSize: BucketSize;
  defaultLotSizing: LotSizingType;
  defaultFixedLotSize: number;
  safetyStockPolicy: 'fixed' | 'days_of_coverage' | 'none';
  defaultSafetyStockDays: number;
  considerInTransit: boolean;
  considerWorkInProcess: boolean;
  enableSubstitute: boolean;
}

/**
 * MRP 一次运行的入参
 */
export interface MRPRunParams {
  runType: 'full' | 'net_change';
  planStartDate: string;
  planEndDate?: string;
  productIds?: number[];
  warehouseId?: number;
  createdBy?: string;
  remark?: string;
}

/**
 * 单个时间分段内的 MRP 供需明细
 */
export interface MRPTimeBucket {
  bucketDate: string;
  grossRequirement: number;
  scheduledReceipt: number;
  onHandInventory: number;
  netRequirement: number;
  plannedOrderReceipt: number;
  plannedOrderRelease: number;
  actionType?: MRPActionType;
  sourceOrderId?: number;
  sourceOrderNo?: string;
  demandLevel?: number;
  substituteUsed?: number;
}

/**
 * 单个物料在 MRP 运行中的完整分析结果
 */
export interface MRPMaterialResult {
  materialId: number;
  materialCode: string;
  materialName: string;
  materialType: 'product' | 'semi' | 'material';
  unit: string;
  safetyStock: number;
  leadTimeDays: number;
  lotSizing: LotSizingType;
  fixedLotSize: number;
  eoq?: number;
  buckets: MRPTimeBucket[];
  totalGross: number;
  totalNet: number;
  totalPlanned: number;
  endOnHand: number;
}

/**
 * MRP 一次运行的完整结果
 */
export interface MRPRunResult {
  runId: number;
  runNo: string;
  status: MRPStatus;
  materialCount: number;
  productCount: number;
  plannedOrderCount: number;
  purchaseReqCount: number;
  workOrderCount: number;
  materials: MRPMaterialResult[];
  capacityLoads?: CapacityLoad[];
  warnings: string[];
  startTime: Date;
  endTime?: Date;
}

/**
 * 工作中心产能负荷分析数据
 */
export interface CapacityLoad {
  workCenterId: number;
  workCenterCode: string;
  workCenterName: string;
  capacityDate: string;
  standardCapacity: number;
  requiredCapacity: number;
  loadRate: number;
  isOverloaded: boolean;
}

/**
 * 替代物料信息
 */
export interface SubstituteMaterial {
  materialId: number;
  materialCode: string;
  materialName: string;
  substituteQty: number;
  priority: number;
  effectiveDate?: string;
  expiryDate?: string;
}

interface GrossRequirementRow extends RowDataPacket {
  source_id: number;
  source_no: string;
  material_id: number;
  material_code: string;
  material_name: string;
  quantity: number;
  due_date: string;
}

interface MaterialInfoRow extends RowDataPacket {
  id: number;
  material_code: string;
  material_name: string;
  unit: string;
  safety_stock: number;
  lead_time_days: number;
  material_type: string;
  purchase_price: number;
  order_cost: number;
  holding_cost_rate: number;
  lot_sizing: LotSizingType;
  fixed_lot_size: number;
  eoq: number;
  period_supply_days: number;
}

interface InventoryTotalRow extends RowDataPacket {
  total: number;
}

interface ScheduledReceiptRow extends RowDataPacket {
  receipt_date: string;
  qty: number;
}

interface BomChildRow extends RowDataPacket {
  material_id: number;
  consumption_qty: number;
  loss_rate: number;
}

interface ProcessRouteCapacityRow extends RowDataPacket {
  work_center_id: number;
  work_center_code: string;
  work_center_name: string;
  standard_hours: number;
  daily_capacity: number;
}

const DEFAULT_CONFIG: MRPConfig = {
  horizonDays: 180,
  bucketSize: 'day',
  defaultLotSizing: 'lot_for_lot',
  defaultFixedLotSize: 0,
  safetyStockPolicy: 'fixed',
  defaultSafetyStockDays: 7,
  considerInTransit: true,
  considerWorkInProcess: true,
  enableSubstitute: true,
};

/**
 * 计算经济订购批量（EOQ）
 *
 * 使用经典的 EOQ 公式：EOQ = sqrt(2 × 年需求 × 订购成本 / 单位持有成本)
 * 其中单位持有成本 = 单价 × 持有成本率
 *
 * @param annualDemand - 年需求量
 * @param orderingCost - 每次订购成本
 * @param holdingCostRate - 持有成本率（小数，如 0.2 表示 20%）
 * @param unitPrice - 物料单价
 * @returns 经济订购批量，若任何参数 ≤ 0 则返回 0
 */
export function calculateEOQ(
  annualDemand: number,
  orderingCost: number,
  holdingCostRate: number,
  unitPrice: number
): number {
  if (annualDemand <= 0 || orderingCost <= 0 || holdingCostRate <= 0 || unitPrice <= 0) {
    return 0;
  }
  const holdingCost = unitPrice * holdingCostRate;
  return Math.sqrt((2 * annualDemand * orderingCost) / holdingCost);
}

/**
 * 应用批量化规则调整订单数量
 *
 * 支持四种策略：
 * - lot_for_lot：按需订购，不做调整
 * - fixed：按固定批量向上取整
 * - eoq：按经济订购批量向上取整
 * - period_supply：按需订购（周期内合并由上游处理）
 *
 * @param netRequirement - 净需求数量
 * @param lotSizing - 批量化策略类型
 * @param fixedLotSize - 固定批量大小
 * @param eoq - 经济订购批量
 * @param periodSupplyDays - 供应周期天数（暂未使用）
 * @returns 调整后的计划订单数量，净需求 ≤ 0 时返回 0
 */
export function applyLotSizing(
  netRequirement: number,
  lotSizing: LotSizingType,
  fixedLotSize: number = 0,
  eoq: number = 0,
  periodSupplyDays: number = 0
): number {
  if (netRequirement <= 0) return 0;

  switch (lotSizing) {
    case 'lot_for_lot':
      return netRequirement;

    case 'fixed':
      if (fixedLotSize <= 0) return netRequirement;
      return Math.ceil(netRequirement / fixedLotSize) * fixedLotSize;

    case 'eoq':
      if (eoq <= 0) return netRequirement;
      return Math.ceil(netRequirement / eoq) * eoq;

    case 'period_supply':
      return netRequirement;

    default:
      return netRequirement;
  }
}

/**
 * 计算安全库存量
 *
 * 支持三种策略：
 * - none：不使用安全库存，返回 0
 * - fixed：使用固定的安全库存值
 * - days_of_coverage：按日均需求 × 覆盖天数计算
 *
 * @param policy - 安全库存策略
 * @param fixedSafetyStock - 固定安全库存量（policy 为 'fixed' 时使用）
 * @param dailyAvgDemand - 日均需求量
 * @param daysOfCoverage - 覆盖天数（policy 为 'days_of_coverage' 时使用）
 * @returns 计算得到的安全库存量
 */
export function calculateSafetyStock(
  policy: 'fixed' | 'days_of_coverage' | 'none',
  fixedSafetyStock: number,
  dailyAvgDemand: number,
  daysOfCoverage: number
): number {
  switch (policy) {
    case 'none':
      return 0;
    case 'fixed':
      return fixedSafetyStock || 0;
    case 'days_of_coverage':
      return Math.round(dailyAvgDemand * daysOfCoverage * 10000) / 10000;
    default:
      return 0;
  }
}

/**
 * 生成时间分段日期列表
 *
 * 从起始日期开始，按 day/week/month 粒度将时间范围划分为等长分段，
 * 每个分段包含一个标识日期和该段内的所有日期。
 *
 * @param startDate - 起始日期（YYYY-MM-DD）
 * @param days - 时间范围总天数
 * @param bucketSize - 分段粒度：'day' | 'week' | 'month'
 * @returns 时间分段数组，每项包含标识日期、起止日期和段内所有日期
 */
export function generateBucketDates(
  startDate: string,
  days: number,
  bucketSize: BucketSize
): { bucketDate: string; start: Date; end: Date; dates: string[] }[] {
  const buckets: { bucketDate: string; start: Date; end: Date; dates: string[] }[] = [];
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + days - 1);

  let current = new Date(start);

  while (current <= end) {
    const bucketStart = new Date(current);
    let bucketEnd: Date;
    const dates: string[] = [];

    switch (bucketSize) {
      case 'day':
        bucketEnd = new Date(current);
        dates.push(formatDateStr(current));
        current.setDate(current.getDate() + 1);
        break;

      case 'week': {
        const dayOfWeek = current.getDay();
        const daysToAdd = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
        bucketEnd = new Date(current);
        bucketEnd.setDate(bucketEnd.getDate() + daysToAdd);
        if (bucketEnd > end) bucketEnd = new Date(end);
        for (let d = new Date(bucketStart); d <= bucketEnd; d.setDate(d.getDate() + 1)) {
          dates.push(formatDateStr(d));
        }
        current = new Date(bucketEnd);
        current.setDate(current.getDate() + 1);
        break;
      }

      case 'month': {
        const year = current.getFullYear();
        const month = current.getMonth();
        bucketEnd = new Date(year, month + 1, 0);
        if (bucketEnd > end) bucketEnd = new Date(end);
        for (let d = new Date(bucketStart); d <= bucketEnd; d.setDate(d.getDate() + 1)) {
          dates.push(formatDateStr(d));
        }
        current = new Date(bucketEnd);
        current.setDate(current.getDate() + 1);
        break;
      }

      default:
        bucketEnd = new Date(current);
        dates.push(formatDateStr(current));
        current.setDate(current.getDate() + 1);
    }

    buckets.push({
      bucketDate: formatDateStr(bucketStart),
      start: bucketStart,
      end: bucketEnd,
      dates,
    });
  }

  return buckets;
}

/**
 * MRP 计算引擎 V2
 *
 * 面向对象的 MRP 计算引擎，支持完整的物料需求计划流程：
 * 1. 收集毛需求（销售订单）
 * 2. 多层级 BOM 展开，逐级传递依赖需求
 * 3. 时间分段供需平衡计算
 * 4. 产能负荷分析
 *
 * 使用方式：
 * ```typescript
 * const engine = new MRPEngine({ horizonDays: 90, bucketSize: 'week' });
 * const result = await engine.run({
 *   runType: 'full',
 *   planStartDate: '2024-01-01',
 *   warehouseId: 1,
 *   productIds: [101, 102]
 * });
 * ```
 */
export class MRPEngine {
  private config: MRPConfig;
  private conn: PoolConnection | null;
  private warnings: string[] = [];

  /**
   * 创建 MRP 引擎实例
   *
   * @param config - 可选，部分 MRP 配置参数，未指定的使用默认值
   * @param conn - 可选，外部数据库连接，不传则 run 时自动获取
   */
  constructor(config?: Partial<MRPConfig>, conn?: PoolConnection) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.conn = conn || null;
  }

  /**
   * 执行 MRP 计算
   *
   * 完整执行一次 MRP 运算，包括：
   * 1. 生成运行编号
   * 2. 收集销售订单毛需求
   * 3. 多层级物料展开，逐级计算供需平衡
   * 4. 产能负荷分析
   * 5. 汇总统计（计划订单数、采购申请数、工单数）
   *
   * @param params - MRP 运行参数
   * @returns MRP 运行完整结果，包含物料分析、产能负荷和警告信息
   */
  async run(params: MRPRunParams): Promise<MRPRunResult> {
    const startTime = new Date();
    this.warnings = [];

    const conn = this.conn || (await getConnection());
    const isExternalConn = !!this.conn;

    try {
      const planStartDate = params.planStartDate || formatDateStr(new Date());
      const horizonDays = this.config.horizonDays;
      const endDate = new Date(planStartDate + 'T00:00:00');
      endDate.setDate(endDate.getDate() + horizonDays - 1);
      const planEndDate = formatDateStr(endDate);

      const runNo = await generateDocumentNo('mrp_run');

      const demands = await this.collectGrossRequirements(
        conn,
        planStartDate,
        planEndDate,
        params.productIds
      );

      const productIds = [...new Set(demands.map((d) => d.materialId))];

      const materials = await this.processAllMaterials(
        conn,
        demands,
        planStartDate,
        horizonDays,
        params.warehouseId
      );

      const capacityLoads = await this.calculateCapacityRequired(
        conn,
        materials,
        planStartDate,
        horizonDays
      );

      let plannedOrderCount = 0;
      let purchaseReqCount = 0;
      let workOrderCount = 0;

      for (const m of materials) {
        for (const b of m.buckets) {
          if (b.plannedOrderRelease > 0) {
            plannedOrderCount++;
            if (b.actionType === 'produce') {
              workOrderCount++;
            } else if (b.actionType === 'purchase') {
              purchaseReqCount++;
            }
          }
        }
      }

      return {
        runId: 0,
        runNo,
        status: 'completed',
        materialCount: materials.length,
        productCount: productIds.length,
        plannedOrderCount,
        purchaseReqCount,
        workOrderCount,
        materials,
        capacityLoads,
        warnings: this.warnings,
        startTime,
        endTime: new Date(),
      };
    } finally {
      if (!isExternalConn && conn && conn.release) {
        conn.release();
      }
    }
  }

  private async collectGrossRequirements(
    conn: PoolConnection,
    startDate: string,
    endDate: string,
    productIds?: number[]
  ): Promise<
    {
      materialId: number;
      materialCode: string;
      materialName: string;
      quantity: number;
      dueDate: string;
      sourceType: string;
      sourceId: number;
      sourceNo: string;
    }[]
  > {
    const demands: {
      materialId: number;
      materialCode: string;
      materialName: string;
      quantity: number;
      dueDate: string;
      sourceType: string;
      sourceId: number;
      sourceNo: string;
    }[] = [];

    let sql = `
      SELECT 
        so.id as source_id,
        so.order_no as source_no,
        sod.product_id as material_id,
        im.material_code,
        im.material_name,
        sod.quantity,
        so.delivery_date as due_date
      FROM sal_order so
      INNER JOIN sal_order_detail sod ON sod.order_id = so.id
      INNER JOIN inv_material im ON im.id = sod.product_id
      WHERE so.deleted = 0
        AND sod.deleted = 0
        AND so.status IN (1, 2)
        AND so.delivery_date BETWEEN ? AND ?
    `;

    const params: (string | number)[] = [startDate, endDate];

    if (productIds && productIds.length > 0) {
      sql += ` AND sod.product_id IN (${productIds.map(() => '?').join(',')})`;
      params.push(...productIds);
    }

    sql += ` ORDER BY so.delivery_date`;

    const [rows] = await conn.query<GrossRequirementRow[]>(sql, params);

    for (const row of rows) {
      demands.push({
        materialId: Number(row.material_id),
        materialCode: row.material_code || '',
        materialName: row.material_name || '',
        quantity: Number(row.quantity || 0),
        dueDate: formatDateStr(row.due_date),
        sourceType: 'sales_order',
        sourceId: Number(row.source_id),
        sourceNo: row.source_no || '',
      });
    }

    secureLog('info', `MRP收集需求完成`, {
      demandCount: demands.length,
      dateRange: `${startDate} ~ ${endDate}`,
    });

    return demands;
  }

  private async processAllMaterials(
    conn: PoolConnection,
    demands: { materialId: number; quantity: number; dueDate: string }[],
    startDate: string,
    horizonDays: number,
    warehouseId?: number
  ): Promise<MRPMaterialResult[]> {
    const materialMap = new Map<number, MRPMaterialResult>();
    const processed = new Set<number>();

    const demandMap = new Map<number, Map<string, number>>();
    for (const d of demands) {
      if (!demandMap.has(d.materialId)) {
        demandMap.set(d.materialId, new Map());
      }
      const dateMap = demandMap.get(d.materialId)!;
      dateMap.set(d.dueDate, (dateMap.get(d.dueDate) || 0) + d.quantity);
    }

    const productIds = [...demandMap.keys()];
    const queue = [...productIds];
    const levelMap = new Map<number, number>();
    for (const pid of productIds) {
      levelMap.set(pid, 0);
    }

    while (queue.length > 0) {
      const materialId = queue.shift()!;

      if (processed.has(materialId)) continue;
      processed.add(materialId);

      const materialInfo = await this.getMaterialInfo(conn, materialId);
      if (!materialInfo) {
        this.warnings.push(`物料ID ${materialId} 不存在，跳过`);
        continue;
      }

      const demandDates = demandMap.get(materialId) || new Map();
      const buckets = await this.calculateMaterialBuckets(
        conn,
        materialId,
        materialInfo,
        demandDates,
        startDate,
        horizonDays,
        warehouseId
      );

      // 外购物料标记为 purchase，自制件标记为 produce 后续展开子件
      const isPurchase = materialInfo.material_type === 'purchase';
      const actionType: MRPActionType = isPurchase ? 'purchase' : 'produce';

      for (const bucket of buckets) {
        bucket.actionType = actionType;
      }

      const materialResult: MRPMaterialResult = {
        materialId,
        materialCode: materialInfo.material_code,
        materialName: materialInfo.material_name,
        materialType: isPurchase
          ? 'material'
          : materialInfo.material_type === 'semi'
            ? 'semi'
            : 'product',
        unit: materialInfo.unit,
        safetyStock: Number(materialInfo.safety_stock || 0),
        leadTimeDays: Number(
          materialInfo.lead_time_days ||
            (await CalcParamService.getInt('mrp.default_lead_time_days', 7))
        ),
        lotSizing: this.config.defaultLotSizing,
        fixedLotSize: this.config.defaultFixedLotSize,
        buckets,
        totalGross: buckets.reduce((s, b) => s + b.grossRequirement, 0),
        totalNet: buckets.reduce((s, b) => s + b.netRequirement, 0),
        totalPlanned: buckets.reduce((s, b) => s + b.plannedOrderReceipt, 0),
        endOnHand: buckets.length > 0 ? buckets[buckets.length - 1].onHandInventory : 0,
      };

      materialMap.set(materialId, materialResult);

      // 自制件需要展开 BOM，将计划下达量作为下级子件的毛需求
      if (!isPurchase) {
        const children = await this.getBOMChildren(conn, materialId);
        for (const child of children) {
          if (!processed.has(child.material_id)) {
            queue.push(child.material_id);
          }

          const childDemandMap = demandMap.get(child.material_id) || new Map();
          for (const bucket of buckets) {
            if (bucket.plannedOrderRelease > 0) {
              // 子件毛需求 = 计划下达量 × 单位用量 × (1 + 损耗率/100)
              const childQty =
                bucket.plannedOrderRelease * child.consumption_qty * (1 + child.loss_rate / 100);
              childDemandMap.set(
                bucket.bucketDate,
                (childDemandMap.get(bucket.bucketDate) || 0) + childQty
              );
            }
          }
          demandMap.set(child.material_id, childDemandMap);
        }
      }
    }

    return Array.from(materialMap.values()).sort((a, b) =>
      a.materialCode.localeCompare(b.materialCode)
    );
  }

  private async calculateMaterialBuckets(
    conn: PoolConnection,
    materialId: number,
    materialInfo: MaterialInfoRow,
    demandDates: Map<string, number>,
    startDate: string,
    horizonDays: number,
    warehouseId?: number
  ): Promise<MRPTimeBucket[]> {
    const buckets = generateBucketDates(startDate, horizonDays, this.config.bucketSize);
    const result: MRPTimeBucket[] = [];

    const safetyStock = calculateSafetyStock(
      this.config.safetyStockPolicy,
      Number(materialInfo.safety_stock || 0),
      this.calculateAvgDailyDemand(demandDates, horizonDays),
      this.config.defaultSafetyStockDays
    );

    const currentOnHand = await this.getCurrentInventory(conn, materialId, warehouseId);

    const scheduledReceipts = await this.getScheduledReceipts(
      conn,
      materialId,
      startDate,
      horizonDays,
      warehouseId
    );

    const leadTimeDays = Number(
      materialInfo.lead_time_days ||
        (await CalcParamService.getInt('mrp.default_lead_time_days', 7))
    );
    const lotSizing = materialInfo.lot_sizing || this.config.defaultLotSizing;
    const fixedLotSize = Number(materialInfo.fixed_lot_size || this.config.defaultFixedLotSize);

    // 滚动在手库存 = 当前库存 - 安全库存
    let runningOnHand = currentOnHand - safetyStock;

    for (const bucket of buckets) {
      let grossReq = 0;
      let schedReceipt = 0;

      // 汇总该分段内所有日期的毛需求和计划收货
      for (const d of bucket.dates) {
        grossReq += demandDates.get(d) || 0;
        schedReceipt += scheduledReceipts.get(d) || 0;
      }

      // 计划前在手库存 = 滚动手在 + 计划收货 - 毛需求
      const projectedOnHandBefore = runningOnHand + schedReceipt - grossReq;

      let netReq = 0;
      let plannedReceipt = 0;

      // 若计划前在手库存为负，则产生净需求，需应用批量化规则
      if (projectedOnHandBefore < 0) {
        netReq = Math.abs(projectedOnHandBefore);
        plannedReceipt = applyLotSizing(netReq, lotSizing, fixedLotSize);
      }

      const onHandAfter = runningOnHand + schedReceipt - grossReq + plannedReceipt;

      result.push({
        bucketDate: bucket.bucketDate,
        grossRequirement: round4(grossReq),
        scheduledReceipt: round4(schedReceipt),
        onHandInventory: round4(Math.max(0, onHandAfter + safetyStock)),
        netRequirement: round4(netReq),
        plannedOrderReceipt: round4(plannedReceipt),
        plannedOrderRelease: 0,
      });

      runningOnHand = onHandAfter;
    }

    // 根据提前期前移计划订单：接收日期的时间分段 -> 释放日期的时间分段
    for (let i = 0; i < result.length; i++) {
      if (result[i].plannedOrderReceipt > 0) {
        const releaseBucketIdx = this.findReleaseBucketIndex(i, leadTimeDays, buckets);
        if (releaseBucketIdx >= 0) {
          result[releaseBucketIdx].plannedOrderRelease = result[i].plannedOrderReceipt;
        } else {
          result[0].plannedOrderRelease += result[i].plannedOrderReceipt;
          this.warnings.push(
            `物料 ${materialInfo.material_code} 计划产出日期 ${result[i].bucketDate} 提前期 ${leadTimeDays} 天超出计划开始日期，提前期不足`
          );
        }
      }
    }

    return result;
  }

  private findReleaseBucketIndex(
    receiptBucketIdx: number,
    leadTimeDays: number,
    buckets: { bucketDate: string; start: Date; end: Date; dates: string[] }[]
  ): number {
    if (receiptBucketIdx < 0) return -1;

    const receiptDate = new Date(buckets[receiptBucketIdx].bucketDate + 'T00:00:00');
    const releaseDate = new Date(receiptDate);
    releaseDate.setDate(releaseDate.getDate() - leadTimeDays);

    for (let i = 0; i < buckets.length; i++) {
      if (releaseDate >= buckets[i].start && releaseDate <= buckets[i].end) {
        return i;
      }
      if (releaseDate < buckets[i].start) {
        return i - 1;
      }
    }

    return -1;
  }

  private async getMaterialInfo(
    conn: PoolConnection,
    materialId: number
  ): Promise<MaterialInfoRow | null> {
    const [rows] = await conn.query<MaterialInfoRow[]>(
      `SELECT 
         im.id, im.material_code, im.material_name, im.unit, 
         im.safety_stock, im.lead_time_days, im.material_type,
         im.purchase_price, im.order_cost, im.holding_cost_rate,
         im.lot_sizing, im.fixed_lot_size, im.eoq,
         im.period_supply_days
       FROM inv_material im 
       WHERE im.id = ? AND im.deleted = 0`,
      [materialId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  private async getCurrentInventory(
    conn: PoolConnection,
    materialId: number,
    warehouseId?: number
  ): Promise<number> {
    let sql = `SELECT COALESCE(SUM(available_qty), 0) as total
               FROM inv_inventory
               WHERE material_id = ? AND deleted = 0`;
    const params: (string | number)[] = [materialId];

    if (warehouseId) {
      sql += ` AND warehouse_id = ?`;
      params.push(warehouseId);
    }

    const [rows] = await conn.query<InventoryTotalRow[]>(sql, params);
    return Number(rows.length > 0 ? rows[0].total || 0 : 0);
  }

  private async getScheduledReceipts(
    conn: PoolConnection,
    materialId: number,
    startDate: string,
    horizonDays: number,
    warehouseId?: number
  ): Promise<Map<string, number>> {
    const receiptMap = new Map<string, number>();

    const endDate = new Date(startDate + 'T00:00:00');
    endDate.setDate(endDate.getDate() + horizonDays - 1);
    const endDateStr = formatDateStr(endDate);

    if (this.config.considerInTransit) {
      const poSql = `
        SELECT DATE(po.delivery_date) as receipt_date,
               COALESCE(SUM(pol.order_qty - pol.received_qty), 0) as qty
        FROM pur_purchase_order po
        INNER JOIN pur_purchase_order_line pol ON pol.po_id = po.id
        WHERE pol.material_id = ?
          AND po.deleted = 0
          AND po.status IN (20, 30)
          AND po.delivery_date BETWEEN ? AND ?
          AND pol.order_qty > pol.received_qty
        GROUP BY DATE(po.delivery_date)
      `;
      const [poRows] = await conn.query<ScheduledReceiptRow[]>(poSql, [
        materialId,
        startDate,
        endDateStr,
      ]);
      for (const row of poRows) {
        const d = formatDateStr(row.receipt_date);
        receiptMap.set(d, (receiptMap.get(d) || 0) + Number(row.qty || 0));
      }
    }

    if (this.config.considerWorkInProcess) {
      const woSql = `
        SELECT DATE(wo.plan_finish_date) as receipt_date,
               COALESCE(SUM(wo.quantity - wo.finished_qty), 0) as qty
        FROM prod_work_order wo
        WHERE wo.product_id = ?
          AND wo.deleted = 0
          AND wo.status IN (1, 2, 3)
          AND wo.plan_finish_date BETWEEN ? AND ?
          AND wo.quantity > wo.finished_qty
        GROUP BY DATE(wo.plan_finish_date)
      `;
      const [woRows] = await conn.query<ScheduledReceiptRow[]>(woSql, [
        materialId,
        startDate,
        endDateStr,
      ]);
      for (const row of woRows) {
        const d = formatDateStr(row.receipt_date);
        receiptMap.set(d, (receiptMap.get(d) || 0) + Number(row.qty || 0));
      }
    }

    return receiptMap;
  }

  private async getBOMChildren(
    conn: PoolConnection,
    productId: number
  ): Promise<{ material_id: number; consumption_qty: number; loss_rate: number }[]> {
    const [rows] = await conn.query<BomChildRow[]>(
      `SELECT bl.material_id, bl.consumption_qty, bl.loss_rate
       FROM bom_header bh
       INNER JOIN bom_line bl ON bl.bom_id = bh.id
       WHERE bh.product_id = ? 
         AND bh.status = 30 
         AND bh.deleted = 0
         AND bl.deleted = 0
       ORDER BY bh.is_default DESC, bh.version DESC
       LIMIT 100`,
      [productId]
    );
    return rows.map((r) => ({
      material_id: Number(r.material_id),
      consumption_qty: Number(r.consumption_qty || 0),
      loss_rate: Number(r.loss_rate || 0),
    }));
  }

  private calculateAvgDailyDemand(demandDates: Map<string, number>, horizonDays: number): number {
    let total = 0;
    for (const qty of demandDates.values()) {
      total += qty;
    }
    return horizonDays > 0 ? total / horizonDays : 0;
  }

  /**
   * 计算产能负荷需求
   *
   * 遍历所有非采购物料（产品/半成品）的计划订单，根据工艺路线计算各工位中心的
   * 标准工时需求。负荷率 = 需求工时 / 标准产能，负荷率 > 1 表示超负荷。
   *
   * @param conn - 数据库连接
   * @param materials - 所有物料的 MRP 分析结果
   * @param startDate - 计算起始日期
   * @param horizonDays - 计算范围天数
   * @returns 各工作中心按日期汇总的产能负荷分析
   */
  async calculateCapacityRequired(
    conn: PoolConnection,
    materials: MRPMaterialResult[],
    startDate: string,
    horizonDays: number
  ): Promise<CapacityLoad[]> {
    const capacityMap = new Map<string, CapacityLoad>();
    const buckets = generateBucketDates(startDate, horizonDays, this.config.bucketSize);

    const productMaterials = materials.filter((m) => m.materialType !== 'material');

    for (const m of productMaterials) {
      for (const bucket of m.buckets) {
        if (bucket.plannedOrderRelease <= 0) continue;

        const [processRows] = await conn.query<ProcessRouteCapacityRow[]>(
          `SELECT pr.work_center_id, wc.work_center_code, wc.work_center_name,
                  pr.standard_hours, wc.daily_capacity
           FROM pro_process_route pr
           INNER JOIN pro_work_center wc ON wc.id = pr.work_center_id
           WHERE pr.product_id = ? AND pr.status = 1
           ORDER BY pr.seq_no`,
          [m.materialId]
        );

        for (const pr of processRows) {
          // 需求工时 = 计划生产数量 × 标准工时
          const requiredHours = bucket.plannedOrderRelease * Number(pr.standard_hours || 0);
          const key = `${pr.work_center_id}_${bucket.bucketDate}`;

          if (!capacityMap.has(key)) {
            capacityMap.set(key, {
              workCenterId: Number(pr.work_center_id),
              workCenterCode: pr.work_center_code || '',
              workCenterName: pr.work_center_name || '',
              capacityDate: bucket.bucketDate,
              standardCapacity: Number(pr.daily_capacity || 8),
              requiredCapacity: 0,
              loadRate: 0,
              isOverloaded: false,
            });
          }

          const entry = capacityMap.get(key)!;
          entry.requiredCapacity += requiredHours;
          // 负荷率 = 需求工时 / 标准产能
          entry.loadRate =
            entry.standardCapacity > 0 ? entry.requiredCapacity / entry.standardCapacity : 0;
          // 负荷率 > 1 表示超负荷
          entry.isOverloaded = entry.loadRate > 1;
        }
      }
    }

    return Array.from(capacityMap.values()).sort((a, b) => {
      if (a.workCenterCode !== b.workCenterCode) {
        return a.workCenterCode.localeCompare(b.workCenterCode);
      }
      return a.capacityDate.localeCompare(b.capacityDate);
    });
  }
}

/**
 * 将 Date 或日期字符串格式化为 YYYY-MM-DD 格式
 *
 * @param d - Date 对象或日期字符串
 * @returns YYYY-MM-DD 格式的日期字符串
 */
function formatDateStr(d: Date | string): string {
  if (typeof d === 'string') {
    return d.substring(0, 10);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 四舍五入保留 4 位小数
 *
 * @param v - 要舍入的数值
 * @returns 保留 4 位小数的数值
 */
function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

export { formatDateStr, round4 };
