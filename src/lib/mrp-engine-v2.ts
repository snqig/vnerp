import { query, execute, transaction, getConnection } from '@/lib/db';
import { generateDocumentNo } from '@/lib/document-numbering';
import { secureLog } from '@/lib/logger';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

export type LotSizingType = 'lot_for_lot' | 'fixed' | 'eoq' | 'period_supply';
export type BucketSize = 'day' | 'week' | 'month';
export type MRPActionType = 'produce' | 'purchase' | 'transfer';
export type MRPStatus = 'calculating' | 'completed' | 'confirmed' | 'cancelled';

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

export interface MRPRunParams {
  runType: 'full' | 'net_change';
  planStartDate: string;
  planEndDate?: string;
  productIds?: number[];
  warehouseId?: number;
  createdBy?: string;
  remark?: string;
}

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

export class MRPEngine {
  private config: MRPConfig;
  private conn: PoolConnection | null;
  private warnings: string[] = [];

  constructor(config?: Partial<MRPConfig>, conn?: PoolConnection) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.conn = conn || null;
  }

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
        leadTimeDays: Number(materialInfo.lead_time_days || 7),
        lotSizing: this.config.defaultLotSizing,
        fixedLotSize: this.config.defaultFixedLotSize,
        buckets,
        totalGross: buckets.reduce((s, b) => s + b.grossRequirement, 0),
        totalNet: buckets.reduce((s, b) => s + b.netRequirement, 0),
        totalPlanned: buckets.reduce((s, b) => s + b.plannedOrderReceipt, 0),
        endOnHand: buckets.length > 0 ? buckets[buckets.length - 1].onHandInventory : 0,
      };

      materialMap.set(materialId, materialResult);

      if (!isPurchase) {
        const children = await this.getBOMChildren(conn, materialId);
        for (const child of children) {
          if (!processed.has(child.material_id)) {
            queue.push(child.material_id);
          }

          const childDemandMap = demandMap.get(child.material_id) || new Map();
          for (const bucket of buckets) {
            if (bucket.plannedOrderRelease > 0) {
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

    const leadTimeDays = Number(materialInfo.lead_time_days || 7);
    const lotSizing = materialInfo.lot_sizing || this.config.defaultLotSizing;
    const fixedLotSize = Number(materialInfo.fixed_lot_size || this.config.defaultFixedLotSize);

    let runningOnHand = currentOnHand - safetyStock;

    for (const bucket of buckets) {
      let grossReq = 0;
      let schedReceipt = 0;

      for (const d of bucket.dates) {
        grossReq += demandDates.get(d) || 0;
        schedReceipt += scheduledReceipts.get(d) || 0;
      }

      const projectedOnHandBefore = runningOnHand + schedReceipt - grossReq;

      let netReq = 0;
      let plannedReceipt = 0;

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
          entry.loadRate =
            entry.standardCapacity > 0 ? entry.requiredCapacity / entry.standardCapacity : 0;
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

function formatDateStr(d: Date | string): string {
  if (typeof d === 'string') {
    return d.substring(0, 10);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

export { formatDateStr, round4 };
