/**
 * 084 补齐 inv_inventory_batch 的 FIFO 排序/追溯列。
 *
 * 背景（真实缺口，非新增功能）：
 * src/lib/fifo-allocation.ts 的 buildBatchQuery 一直 SELECT split_flag/opened_at/qr_code/location
 * 并按 split_flag、opened_at 排序，但真实库 inv_inventory_batch 从未有这 4 列，
 * 导致「不指定批次 → 自动 FIFO 分配」的整条路径运行时必然报
 * ER_BAD_FIELD_ERROR (1054) Unknown column 'split_flag'。
 * 线上未暴露是因为出库/领料实际都指定了批次号，走的是 specified_batch 分支。
 *
 * 同样引用这些列的模块：
 *   - src/lib/fifo-allocation.ts                          (SELECT + ORDER BY)
 *   - src/lib/fifo-width-slit.ts                          (宽度横切 FIFO)
 *   - src/app/api/warehouse/outbound/fifo/route.ts:76-77   (ORDER BY)
 *   - src/application/services/MaterialLifecycleService.ts (b.opened_at)
 *   - src/lib/warehouse-core.ts:517                        (b.opened_at)
 *
 * 语义（split_flag 取值见 src/lib/status-labels.ts SPLIT_FLAG_LABEL）：
 *   0-整料  1-小料  2-余料（余料优先出库，避免尾数积压）
 *
 * 幂等（information_schema 探测），可反复执行。
 */
import { Connection } from 'mysql2/promise';

const COLS: Array<[string, string, string]> = [
  [
    'inv_inventory_batch',
    'split_flag',
    "TINYINT DEFAULT 0 COMMENT '拆分标记: 0-整料, 1-小料, 2-余料（余料优先出库）'",
  ],
  [
    'inv_inventory_batch',
    'opened_at',
    "DATETIME DEFAULT NULL COMMENT '开封时间，已开封批次优先出库'",
  ],
  ['inv_inventory_batch', 'qr_code', "VARCHAR(100) DEFAULT NULL COMMENT '批次二维码'"],
  ['inv_inventory_batch', 'location', "VARCHAR(50) DEFAULT NULL COMMENT '库位'"],
];

const INDEXES: Array<[string, string, string]> = [
  ['inv_inventory_batch', 'idx_split_flag', 'split_flag'],
  ['inv_inventory_batch', 'idx_qr_code', 'qr_code'],
];

async function columnExists(conn: Connection, table: string, col: string): Promise<boolean> {
  const [rows] = await conn.query(
    `SELECT COUNT(*) c FROM information_schema.columns
     WHERE table_schema = 'vnerpdacahng' AND table_name = ? AND column_name = ?`,
    [table, col]
  );
  return (rows as any[])[0].c > 0;
}

async function indexExists(conn: Connection, table: string, idx: string): Promise<boolean> {
  const [rows] = await conn.query(
    `SELECT COUNT(*) c FROM information_schema.statistics
     WHERE table_schema = 'vnerpdacahng' AND table_name = ? AND index_name = ?`,
    [table, idx]
  );
  return (rows as any[])[0].c > 0;
}

export async function up(conn: Connection): Promise<void> {
  for (const [table, col, def] of COLS) {
    if (!(await columnExists(conn, table, col))) {
      await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${def}`);
      console.log(`+ added ${table}.${col}`);
    } else {
      console.log(`= exists ${table}.${col}`);
    }
  }
  for (const [table, idx, cols] of INDEXES) {
    if (!(await indexExists(conn, table, idx))) {
      await conn.query(`ALTER TABLE \`${table}\` ADD INDEX \`${idx}\` (${cols})`);
      console.log(`+ added index ${table}.${idx}`);
    } else {
      console.log(`= exists index ${table}.${idx}`);
    }
  }
}

export async function down(conn: Connection): Promise<void> {
  for (const [table, idx] of INDEXES) {
    if (await indexExists(conn, table, idx)) {
      await conn.query(`ALTER TABLE \`${table}\` DROP INDEX \`${idx}\``);
      console.log(`- dropped index ${table}.${idx}`);
    }
  }
  for (const [table, col] of COLS) {
    if (await columnExists(conn, table, col)) {
      await conn.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${col}\``);
      console.log(`- dropped ${table}.${col}`);
    }
  }
}
