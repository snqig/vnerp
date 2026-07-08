import { db, type SqlValue } from '@/lib/db';
import { getCacheManager } from '@/lib/cache';

export interface MaterialLifecycleStats {
  totalMaterials: number;
  totalStock: number;
  totalValue: number;
  expiringMaterials: number;
  expiredMaterials: number;
  lowStockMaterials: number;
}

export interface MaterialExpiryWarning {
  id: number;
  materialNo: string;
  materialName: string;
  spec: string;
  warehouseName: string;
  stockQty: number;
  unit: string;
  productionDate: Date | null;
  expireDate: Date | null;
  daysUntilExpiry: number;
  expiryStatus: string;
}

export interface MaterialStockAnalysis {
  materialId: number;
  materialNo: string;
  materialName: string;
  spec: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitPrice: number;
  stockValue: number;
  stockStatus: string;
  warningLevel: number;
}

export interface MaterialBatchInfo {
  batchId: number;
  batchNo: string;
  quantity: number;
  availableQty: number;
  lockedQty: number;
  inboundDate: Date;
  expireDate: Date | null;
  openedAt: Date | null;
  productionDate: Date | null;
  supplierName: string;
  sourceInboundNo: string;
  batchStatus: string;
  daysUntilExpiry: number | null;
}

export interface MaterialConsumeRecord {
  id: number;
  materialId: number;
  batchId: number | null;
  materialName: string;
  batchNo: string;
  consumeQty: number;
  consumeType: string;
  workOrderId: number | null;
  workOrderNo: string | null;
  sourceType: string;
  sourceId: number;
  sourceNo: string;
  operatorName: string;
  createTime: Date;
}

export interface MaterialAdjustmentRecord {
  id: number;
  materialId: number;
  batchId: number | null;
  materialName: string;
  batchNo: string;
  adjustmentType: string;
  beforeQty: number;
  afterQty: number;
  adjustmentQty: number;
  reason: string;
  operatorName: string;
  approveUserName: string | null;
  approveStatus: string;
  createTime: Date;
}

/** 统计行类型 */
interface StatsRow {
  total_materials: number;
  total_stock: number;
  total_value: number;
  expiring_materials: number;
  expired_materials: number;
  low_stock_materials: number;
}

/** 过期预警行类型 */
interface ExpiryWarningRow {
  id: number;
  material_no: string;
  material_name: string;
  spec: string;
  warehouse_name: string;
  stock_qty: number;
  unit: string;
  production_date: Date | null;
  expire_date: Date | null;
  days_until_expiry: number;
  expiry_status: string;
}

/** 库存分析行类型 */
interface StockAnalysisRow {
  id: number;
  material_no: string;
  material_name: string;
  spec: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  unit_price: number;
  stock_value: number;
  stock_status: string;
  warning_level: number;
}

/** 批次信息行类型 */
interface BatchInfoRow {
  batch_id: number;
  batch_no: string;
  quantity: number;
  available_qty: number;
  locked_qty: number;
  inbound_date: Date;
  expire_date: Date | null;
  opened_at: Date | null;
  production_date: Date | null;
  supplier_name: string;
  source_inbound_no: string;
  batch_status: string;
  days_until_expiry: number | null;
}

/** 消耗日志行类型 */
interface ConsumeLogRow {
  id: number;
  material_id: number;
  batch_id: number | null;
  material_name: string;
  batch_no: string;
  consume_qty: number;
  consume_type: string;
  work_order_id: number | null;
  work_order_no: string | null;
  source_type: string;
  source_id: number;
  source_no: string;
  operator_name: string;
  create_time: Date;
}

/** 调整日志行类型 */
interface AdjustmentLogRow {
  id: number;
  material_id: number;
  batch_id: number | null;
  material_name: string;
  batch_no: string;
  adjustment_type: string;
  before_qty: number;
  after_qty: number;
  adjustment_qty: number;
  reason: string;
  operator_name: string;
  approve_user_name: string | null;
  approve_status: string;
  create_time: Date;
}

/** 过期检查行类型 */
interface ExpiryCheckRow {
  id: number;
  material_name: string;
  expire_date: Date;
  warning_days: number;
}

/** 计数行类型 */
interface CountRow {
  total: number;
}

/** 系统用户行类型 */
interface UserRow {
  id: number;
}

export class MaterialLifecycleService {
  private cache = getCacheManager();

  async getStats(): Promise<MaterialLifecycleStats> {
    const cacheKey = 'material_lifecycle_stats';
    const cached = await this.cache.get<MaterialLifecycleStats>(cacheKey);
    if (cached) return cached;

    const stats = await db.query<StatsRow>(
      `SELECT
        COUNT(*) as total_materials,
        COALESCE(SUM(stock_qty), 0) as total_stock,
        COALESCE(SUM(stock_qty * unit_price), 0) as total_value,
        SUM(CASE WHEN expire_date IS NOT NULL AND expire_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND expire_date > CURDATE() THEN 1 ELSE 0 END) as expiring_materials,
        SUM(CASE WHEN expire_date IS NOT NULL AND expire_date <= CURDATE() THEN 1 ELSE 0 END) as expired_materials,
        SUM(CASE WHEN stock_qty <= min_stock THEN 1 ELSE 0 END) as low_stock_materials
      FROM inv_material
      WHERE deleted = 0`
    );

    const result: MaterialLifecycleStats = {
      totalMaterials: Number(stats[0]?.total_materials || 0),
      totalStock: Number(stats[0]?.total_stock || 0),
      totalValue: Number(stats[0]?.total_value || 0),
      expiringMaterials: Number(stats[0]?.expiring_materials || 0),
      expiredMaterials: Number(stats[0]?.expired_materials || 0),
      lowStockMaterials: Number(stats[0]?.low_stock_materials || 0),
    };

    await this.cache.set(cacheKey, result, 300);
    return result;
  }

  async getExpiryWarnings(daysAhead = 30): Promise<MaterialExpiryWarning[]> {
    const rows = await db.query<ExpiryWarningRow>(
      `SELECT
        m.id,
        m.material_no,
        m.material_name,
        m.spec,
        m.warehouse_name,
        m.stock_qty,
        m.unit,
        m.production_date,
        m.expire_date,
        DATEDIFF(m.expire_date, CURDATE()) as days_until_expiry,
        CASE
          WHEN DATEDIFF(m.expire_date, CURDATE()) <= 0 THEN '已过期'
          WHEN DATEDIFF(m.expire_date, CURDATE()) <= m.warning_days THEN '即将过期'
          ELSE '正常'
        END as expiry_status
      FROM inv_material m
      WHERE m.deleted = 0
        AND m.expire_date IS NOT NULL
        AND m.expire_date <= DATE_ADD(CURDATE(), INTERVAL ${daysAhead} DAY)
      ORDER BY days_until_expiry ASC`
    );

    return rows.map((row) => ({
      id: row.id,
      materialNo: row.material_no,
      materialName: row.material_name,
      spec: row.spec,
      warehouseName: row.warehouse_name,
      stockQty: Number(row.stock_qty),
      unit: row.unit,
      productionDate: row.production_date,
      expireDate: row.expire_date,
      daysUntilExpiry: Number(row.days_until_expiry),
      expiryStatus: row.expiry_status,
    }));
  }

  async getStockAnalysis(): Promise<MaterialStockAnalysis[]> {
    const rows = await db.query<StockAnalysisRow>(
      `SELECT
        id,
        material_no,
        material_name,
        spec,
        unit,
        stock_qty as current_stock,
        COALESCE(min_stock, 0) as min_stock,
        COALESCE(max_stock, 0) as max_stock,
        unit_price,
        ROUND(stock_qty * unit_price, 2) as stock_value,
        CASE
          WHEN stock_qty <= 0 THEN '缺货'
          WHEN stock_qty <= min_stock THEN '库存不足'
          WHEN stock_qty >= max_stock THEN '库存过高'
          ELSE '正常'
        END as stock_status,
        CASE
          WHEN stock_qty <= 0 THEN 3
          WHEN stock_qty <= min_stock THEN 2
          WHEN stock_qty >= max_stock THEN 1
          ELSE 0
        END as warning_level
      FROM inv_material
      WHERE deleted = 0
      ORDER BY warning_level DESC, stock_value DESC`
    );

    return rows.map((row) => ({
      materialId: row.id,
      materialNo: row.material_no,
      materialName: row.material_name,
      spec: row.spec,
      unit: row.unit,
      currentStock: Number(row.current_stock),
      minStock: Number(row.min_stock),
      maxStock: Number(row.max_stock),
      unitPrice: Number(row.unit_price),
      stockValue: Number(row.stock_value),
      stockStatus: row.stock_status,
      warningLevel: Number(row.warning_level),
    }));
  }

  async getBatchList(materialId: number): Promise<MaterialBatchInfo[]> {
    const rows = await db.query<BatchInfoRow>(
      `SELECT
        b.id as batch_id,
        b.batch_no,
        b.quantity,
        b.available_qty,
        COALESCE(b.locked_qty, 0) as locked_qty,
        b.inbound_date,
        b.expire_date,
        b.opened_at,
        b.production_date,
        COALESCE(b.supplier_name, '') as supplier_name,
        COALESCE(b.source_inbound_no, '') as source_inbound_no,
        CASE
          WHEN b.expire_date IS NOT NULL AND b.expire_date <= CURDATE() THEN '已过期'
          WHEN b.expire_date IS NOT NULL AND b.expire_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN '30天内过期'
          WHEN b.opened_at IS NOT NULL THEN '已开封'
          ELSE '正常'
        END as batch_status,
        DATEDIFF(b.expire_date, CURDATE()) as days_until_expiry
      FROM inv_inventory_batch b
      WHERE b.material_id = ${materialId} AND b.deleted = 0
      ORDER BY
        CASE WHEN b.opened_at IS NOT NULL THEN b.opened_at ELSE b.inbound_date END ASC,
        b.expire_date ASC,
        b.inbound_date ASC,
        b.id ASC`
    );

    return rows.map((row) => ({
      batchId: row.batch_id,
      batchNo: row.batch_no,
      quantity: Number(row.quantity),
      availableQty: Number(row.available_qty),
      lockedQty: Number(row.locked_qty),
      inboundDate: row.inbound_date,
      expireDate: row.expire_date,
      openedAt: row.opened_at,
      productionDate: row.production_date,
      supplierName: row.supplier_name,
      sourceInboundNo: row.source_inbound_no,
      batchStatus: row.batch_status,
      daysUntilExpiry: row.days_until_expiry !== null ? Number(row.days_until_expiry) : null,
    }));
  }

  async recordConsumption(params: {
    materialId: number;
    batchId?: number;
    consumeQty: number;
    consumeType: string;
    workOrderId?: number;
    workOrderNo?: string;
    sourceType?: string;
    sourceId?: number;
    sourceNo?: string;
    operatorId: number;
    remark?: string;
  }): Promise<number> {
    const result = await db.insert('inv_material_consume_log', {
      material_id: params.materialId,
      batch_id: params.batchId,
      consume_qty: params.consumeQty,
      consume_type: params.consumeType,
      work_order_id: params.workOrderId,
      work_order_no: params.workOrderNo,
      source_type: params.sourceType,
      source_id: params.sourceId,
      source_no: params.sourceNo,
      operator_id: params.operatorId,
      remark: params.remark,
    });

    await db.execute(
      `UPDATE inv_material
      SET stock_qty = stock_qty - ${params.consumeQty},
          update_time = NOW()
      WHERE id = ${params.materialId}`
    );

    if (params.batchId) {
      await db.execute(
        `UPDATE inv_inventory_batch
        SET quantity = quantity - ${params.consumeQty},
            available_qty = available_qty - ${params.consumeQty},
            update_time = NOW()
        WHERE id = ${params.batchId}`
      );
    }

    await this.cache.delete('material_lifecycle_stats');

    return result.insertId;
  }

  async createAdjustment(params: {
    materialId: number;
    batchId?: number;
    adjustmentType: string;
    afterQty: number;
    reason: string;
    operatorId: number;
  }): Promise<number> {
    const material = await db.query<{ stock_qty: number }>(
      `SELECT stock_qty FROM inv_material WHERE id = ${params.materialId}`
    );
    const beforeQty = Number(material[0]?.stock_qty || 0);
    const adjustmentQty = params.afterQty - beforeQty;

    const result = await db.insert('inv_material_adjustment', {
      material_id: params.materialId,
      batch_id: params.batchId,
      adjustment_type: params.adjustmentType,
      before_qty: beforeQty,
      after_qty: params.afterQty,
      adjustment_qty: adjustmentQty,
      reason: params.reason,
      operator_id: params.operatorId,
      approve_status: params.adjustmentType === 'inventory' ? 'pending' : 'approved',
    });

    if (params.adjustmentType !== 'inventory') {
      await this.approveAdjustment(result.insertId, params.operatorId);
    }

    return result.insertId;
  }

  async approveAdjustment(adjustmentId: number, approveUserId: number): Promise<void> {
    await db.execute(
      `UPDATE inv_material_adjustment
      SET approve_user = ${approveUserId},
          approve_status = 'approved'
      WHERE id = ${adjustmentId}`
    );

    const adjustment = await db.query<{ material_id: number; after_qty: number }>(
      `SELECT material_id, after_qty FROM inv_material_adjustment WHERE id = ${adjustmentId}`
    );

    if (adjustment.length > 0) {
      await db.execute(
        `UPDATE inv_material
        SET stock_qty = ${adjustment[0].after_qty},
            update_time = NOW()
        WHERE id = ${adjustment[0].material_id}`
      );
    }

    await this.cache.delete('material_lifecycle_stats');
  }

  async getConsumeLog(
    materialId?: number,
    workOrderId?: number,
    page = 1,
    pageSize = 20
  ): Promise<{ list: MaterialConsumeRecord[]; total: number }> {
    let whereClause = 'WHERE m.deleted = 0';
    const params: SqlValue[] = [];

    if (materialId) {
      whereClause += ' AND l.material_id = ?';
      params.push(materialId);
    }
    if (workOrderId) {
      whereClause += ' AND l.work_order_id = ?';
      params.push(workOrderId);
    }

    const countResult = await db.query<CountRow>(
      `SELECT COUNT(*) as total FROM inv_material_consume_log l ${whereClause}`,
      params
    );
    const total = Number(countResult[0]?.total || 0);

    const offset = (page - 1) * pageSize;
    const rows = await db.query<ConsumeLogRow>(
      `
        SELECT l.*, m.material_name, COALESCE(b.batch_no, '') as batch_no, u.user_name as operator_name
        FROM inv_material_consume_log l
        LEFT JOIN inv_material m ON l.material_id = m.id
        LEFT JOIN inv_inventory_batch b ON l.batch_id = b.id
        LEFT JOIN sys_user u ON l.operator_id = u.id
        ${whereClause}
        ORDER BY l.create_time DESC
        LIMIT ? OFFSET ?
      `,
      [...params, pageSize, offset]
    );

    return {
      list: rows.map((row) => ({
        id: row.id,
        materialId: row.material_id,
        batchId: row.batch_id,
        materialName: row.material_name,
        batchNo: row.batch_no,
        consumeQty: Number(row.consume_qty),
        consumeType: row.consume_type,
        workOrderId: row.work_order_id,
        workOrderNo: row.work_order_no,
        sourceType: row.source_type,
        sourceId: row.source_id,
        sourceNo: row.source_no,
        operatorName: row.operator_name,
        createTime: row.create_time,
      })),
      total,
    };
  }

  async getAdjustmentLog(
    materialId?: number,
    page = 1,
    pageSize = 20
  ): Promise<{ list: MaterialAdjustmentRecord[]; total: number }> {
    let whereClause = 'WHERE a.deleted = 0';
    const params: SqlValue[] = [];

    if (materialId) {
      whereClause += ' AND a.material_id = ?';
      params.push(materialId);
    }

    const countResult = await db.query<CountRow>(
      `SELECT COUNT(*) as total FROM inv_material_adjustment a ${whereClause}`,
      params
    );
    const total = Number(countResult[0]?.total || 0);

    const offset = (page - 1) * pageSize;
    const rows = await db.query<AdjustmentLogRow>(
      `
        SELECT a.*, m.material_name, COALESCE(b.batch_no, '') as batch_no,
               u1.user_name as operator_name, u2.user_name as approve_user_name
        FROM inv_material_adjustment a
        LEFT JOIN inv_material m ON a.material_id = m.id
        LEFT JOIN inv_inventory_batch b ON a.batch_id = b.id
        LEFT JOIN sys_user u1 ON a.operator_id = u1.id
        LEFT JOIN sys_user u2 ON a.approve_user = u2.id
        ${whereClause}
        ORDER BY a.create_time DESC
        LIMIT ? OFFSET ?
      `,
      [...params, pageSize, offset]
    );

    return {
      list: rows.map((row) => ({
        id: row.id,
        materialId: row.material_id,
        batchId: row.batch_id,
        materialName: row.material_name,
        batchNo: row.batch_no,
        adjustmentType: row.adjustment_type,
        beforeQty: Number(row.before_qty),
        afterQty: Number(row.after_qty),
        adjustmentQty: Number(row.adjustment_qty),
        reason: row.reason,
        operatorName: row.operator_name,
        approveUserName: row.approve_user_name,
        approveStatus: row.approve_status,
        createTime: row.create_time,
      })),
      total,
    };
  }

  async runExpiryCheck(): Promise<{ processed: number; notified: number; expired: number }> {
    const rows = await db.query<ExpiryCheckRow>(
      `SELECT id, material_name, expire_date, warning_days
      FROM inv_material
      WHERE deleted = 0
        AND expire_date IS NOT NULL
        AND expire_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        AND status = 'normal'`
    );

    let processed = 0;
    let notified = 0;
    let expired = 0;

    for (const row of rows) {
      processed++;
      const daysUntilExpiry = Math.ceil(
        (new Date(row.expire_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry <= 0) {
        await db.execute(
          `UPDATE inv_material SET status = 'expired' WHERE id = ?`,
          [row.id]
        );
        expired++;
      } else if (daysUntilExpiry <= row.warning_days) {
        const existing = await db.query<{ 1: number }>(
          `SELECT 1 FROM sys_notification WHERE source_type = 'material' AND source_id = ? AND type = 'material_expiry_warning' AND DATE(create_time) = CURDATE() LIMIT 1`,
          [row.id]
        );

        if (existing.length === 0) {
          const users = await db.query<UserRow>(
            `SELECT id FROM sys_user WHERE deleted = 0 AND status = 'active'`
          );

          for (const user of users) {
            await db.insert('sys_notification', {
              title: '物料即将过期',
              content: `物料【${row.material_name}】将在${daysUntilExpiry}天后过期，请及时处理`,
              type: 'material_expiry_warning',
              source_type: 'material',
              source_id: row.id,
              receive_user: user.id,
              is_read: 0,
            });
          }
          notified++;
        }
      }
    }

    await this.cache.delete('material_lifecycle_stats');

    return { processed, notified, expired };
  }
}
