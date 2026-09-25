/**
 * 跨模块关联字段补齐（P0，基于真实 schema 重写）
 *
 * 背景：原《三大改进方向实施方案》的 ALTER 直接引用了真实库中不存在的列/表，
 * 且多处列已存在。本迁移以 INFORMATION_SCHEMA 为权威基准，仅对真实缺失的列/索引执行变更，
 * 并对受影响表做备份，保证可重复执行（幂等）与可回滚（down）。
 *
 * 经实证（2026-09-23 INFORMATION_SCHEMA）：
 *   - prod_work_order.sales_order_id         已存在 → 仅补索引 idx_sales_order
 *   - prod_material_issue 表不存在；活跃表 prod_work_order_material_req 已含 work_order_id → 跳过
 *   - inv_inbound_order.work_order_id        缺失 → 补列 + 索引（po_id 已存在，跳过）
 *   - inv_outbound_order.sales_order_id      缺失（仅有 sales_order_no） → 补列 + 索引
 *   - qc_incoming_inspection.inbound_order_id 缺失 → 补列 + 索引
 *   - fin_receivable 无 source_order_id（实为 order_id）→ CREATE VIEW 另交付修正版，不在本迁移执行
 */

import { Connection } from 'mysql2/promise';

const DB = 'vnerpdacahng';

async function colExists(conn: Connection, table: string, col: string): Promise<boolean> {
  const [rows] = await conn.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [DB, table, col]
  );
  return (rows as any[]).length > 0;
}

async function idxExists(conn: Connection, table: string, idx: string): Promise<boolean> {
  const [rows] = await conn.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
    [DB, table, idx]
  );
  return (rows as any[]).length > 0;
}

async function backupTable(conn: Connection, table: string): Promise<void> {
  const bak = `_bak_20260923_${table}`;
  // 仅首次执行时备份；重复执行安全跳过
  await conn.query(
    `CREATE TABLE IF NOT EXISTS \`${bak}\` AS SELECT * FROM \`${table}\``
  );
}

export async function up(conn: Connection): Promise<void> {
  // 受影响表先备份（仅补列的三张需要）
  await backupTable(conn, 'inv_inbound_order');
  await backupTable(conn, 'inv_outbound_order');
  await backupTable(conn, 'qc_incoming_inspection');

  // 1. inv_inbound_order.work_order_id（关联生产工单）
  if (!(await colExists(conn, 'inv_inbound_order', 'work_order_id'))) {
    await conn.query(
      `ALTER TABLE inv_inbound_order
       ADD COLUMN work_order_id BIGINT UNSIGNED NULL COMMENT '关联生产工单 prod_work_order.id'
       AFTER po_id`
    );
  }
  if (!(await idxExists(conn, 'inv_inbound_order', 'idx_work_order'))) {
    await conn.query(
      `ALTER TABLE inv_inbound_order ADD INDEX idx_work_order (work_order_id)`
    );
  }

  // 2. inv_outbound_order.sales_order_id（关联销售订单 sal_order.id）
  if (!(await colExists(conn, 'inv_outbound_order', 'sales_order_id'))) {
    await conn.query(
      `ALTER TABLE inv_outbound_order
       ADD COLUMN sales_order_id BIGINT UNSIGNED NULL COMMENT '关联销售订单 sal_order.id'
       AFTER customer_id`
    );
  }
  if (!(await idxExists(conn, 'inv_outbound_order', 'idx_sales_order'))) {
    await conn.query(
      `ALTER TABLE inv_outbound_order ADD INDEX idx_sales_order (sales_order_id)`
    );
  }

  // 3. qc_incoming_inspection.inbound_order_id（关联入库单 inv_inbound_order.id）
  if (!(await colExists(conn, 'qc_incoming_inspection', 'inbound_order_id'))) {
    await conn.query(
      `ALTER TABLE qc_incoming_inspection
       ADD COLUMN inbound_order_id BIGINT UNSIGNED NULL COMMENT '关联入库单 inv_inbound_order.id'
       AFTER id`
    );
  }
  if (!(await idxExists(conn, 'qc_incoming_inspection', 'idx_inbound'))) {
    await conn.query(
      `ALTER TABLE qc_incoming_inspection ADD INDEX idx_inbound (inbound_order_id)`
    );
  }

  // 4. prod_work_order.sales_order_id 索引（列已存在，仅补索引）
  if (!(await idxExists(conn, 'prod_work_order', 'idx_sales_order'))) {
    await conn.query(
      `ALTER TABLE prod_work_order ADD INDEX idx_sales_order (sales_order_id)`
    );
  }
}

export async function down(conn: Connection): Promise<void> {
  // 与 up 反向：先删索引（DROP COLUMN 会自动删其索引，这里显式删索引更稳妥）再删列
  if (await idxExists(conn, 'prod_work_order', 'idx_sales_order')) {
    await conn.query(`ALTER TABLE prod_work_order DROP INDEX idx_sales_order`);
  }

  if (await colExists(conn, 'qc_incoming_inspection', 'inbound_order_id')) {
    await conn.query(`ALTER TABLE qc_incoming_inspection DROP COLUMN inbound_order_id`);
  }
  if (await colExists(conn, 'inv_outbound_order', 'sales_order_id')) {
    await conn.query(`ALTER TABLE inv_outbound_order DROP COLUMN sales_order_id`);
  }
  if (await colExists(conn, 'inv_inbound_order', 'work_order_id')) {
    await conn.query(`ALTER TABLE inv_inbound_order DROP COLUMN work_order_id`);
  }
}
