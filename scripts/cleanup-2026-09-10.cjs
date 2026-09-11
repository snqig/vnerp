/**
 * 数据清理（2026-09-10）：备份 → 删除
 *   A. 44 张 `_bak_*` 历史备份表（1766 行）
 *   B. 3 张死表：inv_material_inventory / inv_product_inventory / inv_auxiliary_inventory
 *   C. 盘点测试残留：inv_stocktaking 244-248 / 253-255 + 对应 inv_stocktaking_item
 *
 * 用法：
 *   node scripts/cleanup-2026-09-10.cjs            # dry-run：列目标 + 备份，不删
 *   node scripts/cleanup-2026-09-10.cjs --apply     # 备份后执行删除
 *
 * 安全：删除前强制备份（mysqldump 全表结构+数据）到 .workbuddy/backups/，
 *       备份文件缺失或为空则拒绝删除。
 *
 * ⚠️ 注意：`q()` 返回的是「行数组」，不要再做元组解构（历史踩坑）。
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const mysql = require('mysql2/promise');

const APPLY = process.argv.includes('--apply');
const DB = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vnerpdacahng',
};
const MYSQLDUMP = 'C:/Program Files/MySQL/MySQL Server 8.0/bin/mysqldump.exe';
const BACKUP_DIR = path.resolve(__dirname, '..', '.workbuddy', 'backups');

const STOCKTAKING_IDS = [244, 245, 246, 247, 248, 253, 254, 255];

(async () => {
  const db = await mysql.createConnection(DB);
  // 返回行数组（与 @/lib/db 的 query() 行为一致）
  const q = async (s, a = []) => (await db.query(s, a))[0];

  // ---------- 1. 计算目标 ----------
  const bakRows = await q(
    "SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME LIKE '%\\_bak\\_%' ORDER BY TABLE_NAME"
  );
  const bakTables = bakRows.map((r) => r.t);

  const deadTables = [];
  for (const t of ['inv_material_inventory', 'inv_product_inventory', 'inv_auxiliary_inventory']) {
    const e = await q(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?', [t]
    );
    if (e.length) deadTables.push(t);
  }

  const dropTables = [...bakTables, ...deadTables];

  const stOrders = await q(
    `SELECT id, taking_no, warehouse_id, status, deleted, total_items FROM inv_stocktaking WHERE id IN (${STOCKTAKING_IDS.join(',')}) ORDER BY id`
  );
  const stItems = await q(
    `SELECT COUNT(*) AS n FROM inv_stocktaking_item WHERE taking_id IN (${STOCKTAKING_IDS.join(',')})`
  );
  const stItemCount = stItems[0].n;

  const rowCounts = {};
  let totalRows = 0;
  for (const t of dropTables) {
    const r = await q(`SELECT COUNT(*) AS n FROM \`${t}\``);
    rowCounts[t] = r[0].n;
    totalRows += r[0].n;
  }

  console.log('=== 清理目标 ===');
  console.log(`A. 待 DROP 表: ${dropTables.length} 张（_bak_ ${bakTables.length} + 死表 ${deadTables.length}），共 ${totalRows} 行`);
  if (deadTables.length) {
    console.log(`   死表: ${deadTables.map((t) => `${t}(${rowCounts[t]})`).join(', ')}`);
  }
  console.log(`B. 待删除盘点单: ${stOrders.length} 张 -> ${stOrders.map((o) => `${o.id}(${o.taking_no},wh${o.warehouse_id},del${o.deleted})`).join(', ')}`);
  console.log(`C. 待删除盘点明细: ${stItemCount} 行`);

  if (!APPLY) {
    console.log('\n[dry-run] 未删除。确认无误后加 --apply 执行。');
    await db.end();
    return;
  }

  // ---------- 2. 备份 ----------
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const backupFile = path.join(BACKUP_DIR, `cleanup-${stamp}.sql`);

  const out = execFileSync(MYSQLDUMP, [
    '-h', DB.host, '-u', DB.user,
    '--single-transaction', '--skip-lock-tables', '--routines', '--events',
    DB.database,
    ...dropTables,
    'inv_stocktaking', 'inv_stocktaking_item',
  ], {
    env: { ...process.env, MYSQL_PWD: DB.password },
    maxBuffer: 512 * 1024 * 1024,
  });
  fs.writeFileSync(backupFile, out);

  const size = fs.statSync(backupFile).size;
  console.log(`\n=== 备份 ===\n${backupFile} (${(size / 1024).toFixed(1)} KB)`);
  if (size < 1024) throw new Error('备份文件过小(<1KB)，疑似失败，拒绝执行删除');

  // ---------- 3. 删除 ----------
  console.log('\n=== 执行删除 ===');
  for (const t of dropTables) {
    await db.query(`DROP TABLE \`${t}\``);
    console.log(`  DROP ${t}  ✓`);
  }

  await db.query('START TRANSACTION');
  const [delItems] = await db.query(
    `DELETE FROM inv_stocktaking_item WHERE taking_id IN (${STOCKTAKING_IDS.join(',')})`
  );
  const [delOrders] = await db.query(
    `DELETE FROM inv_stocktaking WHERE id IN (${STOCKTAKING_IDS.join(',')})`
  );
  await db.query('COMMIT');
  console.log(`  DELETE inv_stocktaking_item: ${delItems.affectedRows} 行`);
  console.log(`  DELETE inv_stocktaking: ${delOrders.affectedRows} 行`);

  // ---------- 4. 核验 ----------
  const tstat = await q(
    'SELECT TABLE_TYPE, COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() GROUP BY TABLE_TYPE'
  );
  const bakLeft = await q(
    "SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME LIKE '%\\_bak\\_%'"
  );
  const stLeft = await q('SELECT COUNT(*) AS n FROM inv_stocktaking');
  console.log('\n=== 核验 ===');
  console.log('表统计:', JSON.stringify(tstat));
  console.log('剩余 _bak_ 表:', bakLeft[0].n);
  console.log('剩余盘点单:', stLeft[0].n);

  await db.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
