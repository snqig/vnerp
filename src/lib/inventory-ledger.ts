import type mysql from 'mysql2/promise';
import type { DbConnection, DbResultSetHeader } from '@/types/db';

/**
 * 库存台账统一模块
 * - 所有库存变动都应写 inv_inventory_transaction（财务级流水，不可改删，用于对账/追溯）
 * - inv_inventory 汇总表由 inv_inventory_batch 批次明细派生重算，杜绝双写漂移
 * 注意：调用方负责在事务内调用（conn 复用外层事务）。
 */

/**
 * 统一抽取 `conn.execute` 的结果，避免对返回形态做隐式假设而崩溃。
 * - 生产(mysql2/promise)：`execute` 返回 `[rows, fields]` 元组 → 取 `res[0]`（SELECT 为行数组、UPDATE/INSERT 为 ResultSetHeader）。
 * - 测试 mock / 非 mysql2 连接可能返回 rows 数组直出、`{ rows }` 对象或 `undefined` → 兜底为空，绝不抛 "not iterable"。
 */
function extractExecuteResult(res: unknown): unknown {
  if (Array.isArray(res)) return (res as any[])[0];
  if (res && Array.isArray((res as any).rows)) return (res as any).rows;
  return res ?? [];
}

export type TransType = 'in' | 'out' | 'transfer' | 'adjust' | 'return';

export interface AppendTransactionInput {
  transType: TransType;
  sourceType: string;
  sourceId: number;
  sourceLineId?: number | null;
  materialId: number;
  batchNo?: string | null;
  warehouseId: number;
  locationId?: number | null;
  /** 正数；方向由 transType 表达（return 表示冲销/反向） */
  quantity: number;
  unitPrice?: number;
  totalAmount?: number;
  referenceNo?: string | null;
  remark?: string;
  createBy?: number | null;
  /** 财务科目：借方（如 应收账款）。缺省 NULL，向后兼容既有调用方。 */
  accountDr?: string | null;
  /** 财务科目：贷方（如 成品库存）。缺省 NULL，向后兼容既有调用方。 */
  accountCr?: string | null;
}

/**
 * 写入财务级库存流水（inv_inventory_transaction）。
 * 与库存变动同事务，任一步失败整体回滚。
 */
export async function appendInventoryTransaction(
  conn: DbConnection,
  input: AppendTransactionInput
): Promise<void> {
  const transNo = `${input.transType.toUpperCase()}${Date.now()}-${input.materialId}-${Math.floor(
    Math.random() * 1e6
  )}`;
  await conn.execute(
    `INSERT INTO inv_inventory_transaction (
      trans_no, trans_type, source_type, source_id, source_line_id,
      material_id, batch_no, warehouse_id, location_id, quantity,
      unit_price, total_amount, account_dr, account_cr, reference_no, remark, create_by, create_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      transNo,
      input.transType,
      input.sourceType,
      input.sourceId,
      input.sourceLineId ?? null,
      input.materialId,
      input.batchNo ?? null,
      input.warehouseId,
      input.locationId ?? null,
      input.quantity,
      input.unitPrice ?? 0,
      input.totalAmount ?? 0,
      input.accountDr ?? null,
      input.accountCr ?? null,
      input.referenceNo ?? null,
      input.remark ?? null,
      input.createBy ?? null,
    ]
  );
}

/**
 * 统一库存台账日志写入（R5 修复）。
 * 终结 inv_inventory_log 的三种 INSERT 形态（operation_type / trans_type / change_type）：
 * - 以 operation_type 形态为 canonical（核心业务流与 getInventoryLogs 已依赖）；
 * - 同时填充 trans_type/quantity/source_type/source_no，使 trans 形态日志也能被统一查询，不丢数据。
 * 调用方负责在事务内调用（conn 复用外层事务）。
 */
export interface InventoryLogInput {
  materialId: number;
  warehouseId: number;
  batchNo?: string | null;
  /** 1入 2出 3损耗/盘点调整 4调拨 5报废 6锁定 7解锁 */
  operationType: number;
  operationQty: number;
  beforeQty?: number | null;
  afterQty?: number | null;
  /** 业务类型，同时映射到 source_type */
  businessType?: string | null;
  /** 业务单号，同时映射到 source_no */
  businessNo?: string | null;
  unit?: string | null;
  remark?: string | null;
  operatorId?: number | null;
}

const OP_TO_TRANS: Record<number, string> = {
  1: 'in',
  2: 'out',
  3: 'adjust',
  4: 'transfer',
  5: 'scrap',
  6: 'adjust',
  7: 'adjust',
};

export async function appendInventoryLog(
  conn: DbConnection,
  i: InventoryLogInput
): Promise<void> {
  await conn.execute(
    `INSERT INTO inv_inventory_log (
       material_id, warehouse_id, batch_no,
       operation_type, operation_qty, trans_type, quantity,
       before_qty, after_qty, unit,
       source_type, source_no, business_type, business_no,
       remark, operator_id, create_time
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      i.materialId,
      i.warehouseId,
      i.batchNo ?? null,
      i.operationType,
      i.operationQty,
      OP_TO_TRANS[i.operationType] ?? 'adjust',
      i.operationQty,
      i.beforeQty ?? null,
      i.afterQty ?? null,
      i.unit ?? null,
      i.businessType ?? null,
      i.businessNo ?? null,
      i.businessType ?? null,
      i.businessNo ?? null,
      i.remark ?? null,
      i.operatorId ?? null,
    ]
  );
}

/**
 * 由批次明细(inv_inventory_batch)派生重算汇总表(inv_inventory)。
 * 原则：汇总 = SUM(批次)，所有库存变动后调用，杜绝双写漂移。
 * 已存在汇总行则更新；孤儿批次(有批次无汇总)则补建。
 */
export async function recomputeInventorySummary(
  conn: DbConnection,
  materialId: number,
  warehouseId: number
): Promise<void> {
  const updRes = await conn.execute(
    `UPDATE inv_inventory i
     JOIN (
       SELECT material_id, warehouse_id, SUM(quantity) q, SUM(available_qty) a,
              SUM(COALESCE(width,0) * COALESCE(length,0) * quantity) area,
              SUM(COALESCE(width,0) * COALESCE(length,0) * available_qty) avail_area
       FROM inv_inventory_batch WHERE deleted = 0
       GROUP BY material_id, warehouse_id
     ) b ON b.material_id = i.material_id AND b.warehouse_id = i.warehouse_id
     SET i.quantity      = b.q,
         i.available_qty = b.a,
         i.area          = b.area,
         i.available_area = b.avail_area,
         i.version       = COALESCE(i.version, 0) + 1,
         i.update_time   = NOW()
     WHERE i.material_id = ? AND i.warehouse_id = ? AND i.deleted = 0`,
    [materialId, warehouseId]
  );
  const upd = extractExecuteResult(updRes) as { affectedRows?: number };

  if ((upd?.affectedRows ?? 0) > 0) return;

  // 汇总行不存在：孤儿批次补建
  const selRes = await conn.execute(
    `SELECT b.material_id, m.material_code, m.material_name, b.warehouse_id,
            w.warehouse_name, m.unit, b.q, b.a, b.area
     FROM (
       SELECT material_id, warehouse_id, SUM(quantity) q, SUM(available_qty) a,
              SUM(COALESCE(width,0) * COALESCE(length,0) * quantity) area
       FROM inv_inventory_batch WHERE deleted = 0 GROUP BY material_id, warehouse_id
     ) b
     JOIN inv_material m ON m.id = b.material_id
     JOIN inv_warehouse w ON w.id = b.warehouse_id
     LEFT JOIN inv_inventory i ON i.material_id = b.material_id AND i.warehouse_id = b.warehouse_id AND i.deleted = 0
     WHERE b.material_id = ? AND b.warehouse_id = ? AND i.id IS NULL
     LIMIT 1`,
    [materialId, warehouseId]
  );
  const rows = extractExecuteResult(selRes) as any[];
  if (rows.length > 0) {
    const r = rows[0];
    // R4 修复：孤儿补建改为 UPSERT，避免 `uk_material_warehouse` 无视软删导致
    // "先 SELECT(i.id IS NULL) 再 INSERT" 在并发/遇软删行时撞唯一键整事务回滚。
    // 命中既有行（含软删复活）时仅刷新冗余字段并自增 version，不破坏数量。
    await conn.execute(
      `INSERT INTO inv_inventory (
        material_id, material_code, material_name, warehouse_id, warehouse_name,
        quantity, available_qty, area, batch_no, locked_qty, unit, version, create_time, update_time, deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, 0, NOW(), NOW(), 0)
      ON DUPLICATE KEY UPDATE
        material_code   = VALUES(material_code),
        material_name   = VALUES(material_name),
        warehouse_name  = VALUES(warehouse_name),
        unit            = VALUES(unit),
        version         = COALESCE(version, 0) + 1,
        deleted         = 0,
        update_time     = NOW()`,
      [
        r.material_id,
        r.material_code,
        r.material_name,
        r.warehouse_id,
        r.warehouse_name,
        r.q,
        r.a,
        r.area,
        r.unit,
      ]
    );
  }
}
