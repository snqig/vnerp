/**
 * 给 prod_work_order_process_step 增加「活跃行唯一」约束，从数据库层彻底杜绝
 * process-step 接口并发/StrictMode 双跑导致的工序步骤重复插入。
 *
 * 背景：
 *   process-step 路由的 ensureSteps() 原本只用 SELECT COUNT(*) 做应用层防重，
 *   但页面 Promise.all 并发 + reactStrictMode 双跑导致同一工单并发 ensureSteps
 *   都读到 COUNT=0 并各自 INSERT，每步重复 3 份（已用软删清理 392 行冗余）。
 *   应用层已加 per-工单串行锁（route.ts），本迁移作为数据库层的终防。
 *
 * 难点（soft-delete 兼容）：
 *   该表是软删表（deleted=1 表示已删），392 行冗余已软删但仍占 (work_order_id, step_no)。
 *   直接加 UNIQUE(work_order_id, step_no) 会与软删行冲突建索引失败。
 *   解法：用生成列 active_key —— deleted=0 时取 work_order_id（受唯一约束），
 *         deleted=1 时取 NULL（MySQL 唯一索引允许多个 NULL，互不冲突）。
 *   即 UNIQUE(active_key, step_no)。
 *
 * 正向迁移 (up):   ADD 生成列 + ADD 唯一索引
 * 反向迁移 (down): DROP 唯一索引 + DROP 生成列（可逆）
 */

import { Connection } from 'mysql2/promise';

const TABLE = 'prod_work_order_process_step';
const COL = 'active_key';
const IDX = 'uk_wo_step_active';

async function columnExists(conn: Connection): Promise<boolean> {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [TABLE, COL]
  );
  return (rows as any)[0].c > 0;
}

async function indexExists(conn: Connection): Promise<boolean> {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS c FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [TABLE, IDX]
  );
  return (rows as any)[0].c > 0;
}

export async function up(conn: Connection): Promise<void> {
  // 防御：若仍有活跃重复组，说明脏数据未清，先报错提示人工处理，避免建索引失败。
  const [dupRows] = await conn.execute(
    `SELECT COUNT(*) AS c FROM (
       SELECT work_order_id, step_no FROM ${TABLE} WHERE deleted = 0
       GROUP BY work_order_id, step_no HAVING COUNT(*) > 1
     ) d`
  );
  const dup = (dupRows as any)[0].c;
  if (dup > 0) {
    throw new Error(
      `存在 ${dup} 个活跃重复工序组（work_order_id+step_no），请先清理 prod_work_order_process_step 的重复行再执行本迁移`
    );
  }

  if (!(await columnExists(conn))) {
    await conn.execute(
      `ALTER TABLE ${TABLE}
       ADD COLUMN ${COL} INT GENERATED ALWAYS AS (CASE WHEN deleted = 0 THEN work_order_id ELSE NULL END) STORED`
    );
    console.log(`  ✅ 已添加生成列 ${COL}`);
  } else {
    console.log(`  ⏭  生成列 ${COL} 已存在，跳过`);
  }

  if (!(await indexExists(conn))) {
    await conn.execute(`ALTER TABLE ${TABLE} ADD UNIQUE KEY ${IDX} (${COL}, step_no)`);
    console.log(`  ✅ 已添加唯一索引 ${IDX}(${COL}, step_no)`);
  } else {
    console.log(`  ⏭  唯一索引 ${IDX} 已存在，跳过`);
  }
}

export async function down(conn: Connection): Promise<void> {
  if (await indexExists(conn)) {
    await conn.execute(`ALTER TABLE ${TABLE} DROP INDEX ${IDX}`);
    console.log(`  ✅ 已删除唯一索引 ${IDX}`);
  } else {
    console.log(`  ⏭  唯一索引 ${IDX} 不存在，跳过`);
  }

  if (await columnExists(conn)) {
    await conn.execute(`ALTER TABLE ${TABLE} DROP COLUMN ${COL}`);
    console.log(`  ✅ 已删除生成列 ${COL}`);
  } else {
    console.log(`  ⏭  生成列 ${COL} 不存在，跳过`);
  }
}
