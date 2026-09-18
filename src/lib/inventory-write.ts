/**
 * 库存写入原语（汇总表 + 批次表）
 *
 * ## 背景：QA BUG-001 采购入库并发确认死锁
 *
 * 原实现（多个 handler 与并发测试内联 SQL 均如此）采用
 * 「先 `SELECT ... FROM xxx FOR UPDATE` 判断行是否存在，再决定 UPDATE 还是 INSERT」，
 * 这在 MySQL REPEATABLE READ 下对**尚不存在的行**必然死锁：
 *
 *   1. `SELECT ... FOR UPDATE` 未命中任何记录时，InnoDB 会在唯一索引上加
 *      **间隙锁 / next-key lock**；间隙锁之间是**互相兼容**的，
 *      因此 N 个并发事务可以同时持有同一间隙的间隙锁；
 *   2. 随后的 `INSERT` 需要在同一间隙上加**插入意向锁**，
 *      而插入意向锁与其它事务已持有的间隙锁**互斥**；
 *   3. N 个事务各自持有间隙锁、又都在等对方释放 → 环等待 →
 *      InnoDB 死锁检测介入，回滚 N-1 个事务。
 *
 * 实测指纹：6 并发审核同一「物料 + 仓库」的 6 张入库单 →
 *   1 成功 / 5 失败，失败原因 100% 为
 *   `Deadlock found when trying to get lock; try restarting transaction`。
 *   （批次号虽各不相同，但都落在 `uk_warehouse_material_batch` 的同一间隙上。）
 *
 * ## 修复策略
 *
 * 1. **写入一律 UPSERT**（`INSERT ... ON DUPLICATE KEY UPDATE`），复用唯一键：
 *      - 汇总表：`uk_material_warehouse (material_id, warehouse_id)`
 *      - 批次表：`uk_warehouse_material_batch (warehouse_id, material_id, batch_no, deleted)`
 *    UPSERT 不持间隙锁，插入意向锁之间互相兼容 → 从物理层面消除该类死锁。
 *    并发写同一唯一键时由 InnoDB 串行化（后来者等待先行者提交），语义正确且无死锁。
 *
 * 2. **统一锁序**：所有库存写入路径统一为
 *      `inv_inventory`（汇总行） → `inv_inventory_batch`（批次行）。
 *    统一顺序后即使跨链路并发也不会形成环等待。
 *
 * 3. **兜底重试**：调用方用 `transactionWithRetry()` 包裹整个事务，
 *    对 errno 1213/1205 做指数退避重试，覆盖未来多消费者并发派发等新场景。
 *
 * @see {@link transactionWithRetry} in `@/lib/db`
 */

import type { DbConnection } from '@/types/db';

/** 汇总表 inv_inventory 的 UPSERT 入参 */
export interface UpsertInventorySummaryInput {
  /** 物料 ID（必填） */
  materialId: number;
  /** 物料编码（写入最近一次值） */
  materialCode?: string | null;
  /** 物料名称（写入最近一次值） */
  materialName?: string | null;
  /** 仓库 ID（必填） */
  warehouseId: number;
  /** 本次入库数量，正数为增加 */
  quantity: number;
  /** 本次可用量增量，默认与 quantity 相同 */
  availableQty?: number;
  /** 单位 */
  unit?: string | null;
}

/** 批次表 inv_inventory_batch 的 UPSERT 入参 */
export interface UpsertInventoryBatchInput {
  /** 批次号（必填，参与唯一键） */
  batchNo: string;
  /** 物料 ID（必填） */
  materialId: number;
  /** 物料名称（必填，表列为 NOT NULL） */
  materialName: string;
  /** 仓库 ID（必填） */
  warehouseId: number;
  /** 本次入库数量，正数为增加 */
  quantity: number;
  /** 本次可用量增量，默认与 quantity 相同 */
  availableQty?: number;
  /** 单价，仅在新建批次时写入 */
  unitPrice?: number;
  /** 入库日期（YYYY-MM-DD），默认不写 */
  inboundDate?: string | null;
  /** 生产日期（YYYY-MM-DD），默认不写 */
  produceDate?: string | null;
  /** 批次状态，默认 1（正常） */
  status?: number;
}

/**
 * UPSERT 汇总表 `inv_inventory`
 *
 * 一条语句原子处理「新建 / 已存在累加 / 软删行复活」三种情况，
 * 唯一键 `uk_material_warehouse (material_id, warehouse_id)` 不含 deleted，
 * 因此命中软删行时会将其复活（`deleted = 0`）。
 *
 * @param conn - 事务内连接（必须与后续批次写入同一事务）
 */
export async function upsertInventorySummary(
  conn: DbConnection,
  input: UpsertInventorySummaryInput
): Promise<void> {
  const availableQty = input.availableQty ?? input.quantity;

  await conn.execute(
    `INSERT INTO inv_inventory (
       material_id, material_code, material_name, warehouse_id,
       quantity, available_qty, unit, deleted, create_time
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())
     ON DUPLICATE KEY UPDATE
       quantity = quantity + VALUES(quantity),
       available_qty = available_qty + VALUES(available_qty),
       deleted = 0,
       material_code = VALUES(material_code),
       material_name = VALUES(material_name),
       unit = COALESCE(VALUES(unit), unit),
       update_time = NOW()`,
    [
      input.materialId,
      input.materialCode ?? null,
      input.materialName ?? null,
      input.warehouseId,
      input.quantity,
      availableQty,
      input.unit ?? null,
    ]
  );
}

/**
 * UPSERT 批次表 `inv_inventory_batch`
 *
 * 唯一键 `uk_warehouse_material_batch (warehouse_id, material_id, batch_no, deleted)`
 * **包含 deleted**，因此：
 *   - 命中 `deleted = 0` 的同批次行 → 累加数量；
 *   - 仅有 `deleted = 1` 的软删行 → 不冲突，插入一条新的 `deleted = 0` 行（语义正确）。
 *
 * 这是 BUG-001 的**关键修复点**：替代原先
 * 「`SELECT ... FOR UPDATE` 判存在 → INSERT/UPDATE」的间隙锁反模式。
 *
 * @param conn - 事务内连接
 */
export async function upsertInventoryBatch(
  conn: DbConnection,
  input: UpsertInventoryBatchInput
): Promise<void> {
  const availableQty = input.availableQty ?? input.quantity;

  await conn.execute(
    `INSERT INTO inv_inventory_batch (
       batch_no, material_id, material_name, warehouse_id,
       available_qty, quantity, unit_price, inbound_date, produce_date,
       status, deleted, create_time
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())
     ON DUPLICATE KEY UPDATE
       available_qty = available_qty + VALUES(available_qty),
       quantity = quantity + VALUES(quantity),
       update_time = NOW()`,
    [
      input.batchNo,
      input.materialId,
      input.materialName,
      input.warehouseId,
      availableQty,
      input.quantity,
      input.unitPrice ?? 0,
      input.inboundDate ?? null,
      input.produceDate ?? null,
      input.status ?? 1,
    ]
  );
}
