/**
 * 历史脏数据查重与清洗脚本
 *
 * 用途：在新增唯一约束前/后，遍历目标表按拟定唯一键统计重复数据并输出明细；
 *       支持 --fix 模式清洗（保留 ID 最大的一条有效数据，其余标记删除或物理删除）。
 *
 * 用法：
 *   node scripts/check-duplicate-data.mjs            # 仅报告重复（dry-run，不修改）
 *   node scripts/check-duplicate-data.mjs --fix      # 清洗重复数据
 *   node scripts/check-duplicate-data.mjs --table inv_inbound_order   # 只查单表
 *
 * 安全：默认 dry-run；--fix 才写库。含 deleted 列的表优先软删除（deleted=1），
 *       无 deleted 列的表在 --fix 下物理删除多余行（带明确日志）。
 */
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// ---- 载入 .env ----
function loadEnv() {
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv();

// ---- 目标表与拟定唯一键 ----
const TARGETS = [
  ['inv_inventory_batch', ['warehouse_id', 'material_id', 'batch_no', 'deleted']],
  ['inv_inbound_order', ['order_no', 'deleted']],
  ['inv_inbound_item', ['order_id', 'material_id', 'batch_no', 'deleted']],
  ['inv_outbound_item', ['order_id', 'material_id', 'batch_no', 'deleted']],
  ['sys_exchange_rate', ['from_currency', 'to_currency', 'rate_date']],
  ['prd_process_card', ['factory_id', 'card_no']],
  ['prd_die_template', ['factory_id', 'template_code']],
  // 历史已存在唯一约束的主数据（一并巡检）
  ['inv_material', ['material_code']],
  ['pur_supplier', ['supplier_code']],
  ['crm_customer', ['customer_code']],
  ['sys_user', ['username']],
  ['sys_role', ['role_code']],
  ['sys_currency', ['code']],
  ['sys_dict_type', ['dict_code']],
];

const FIX = process.argv.includes('--fix');
const onlyTable = (() => {
  const i = process.argv.indexOf('--table');
  return i > -1 ? process.argv[i + 1] : null;
})();

async function hasDeleted(conn, table) {
  const [r] = await conn.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME='deleted' LIMIT 1`,
    [table]
  );
  return r.length > 0;
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vnerpdacahng',
    multipleStatements: true,
  });

  const targets = onlyTable ? TARGETS.filter(([t]) => t === onlyTable) : TARGETS;
  let totalGroups = 0;
  let totalDupRows = 0;
  let fixRows = 0;

  console.log(`\n🔍 重复数据查重（${FIX ? 'FIX 模式' : 'DRY-RUN 模式'}）\n`);

  for (const [table, cols] of targets) {
    const colList = cols.join(', ');
    const [dups] = await conn.query(
      `SELECT ${colList}, COUNT(*) AS c FROM \`${table}\` GROUP BY ${colList} HAVING c > 1`
    );
    if (dups.length === 0) {
      console.log(`  ✅ ${table}: 无重复`);
      continue;
    }
    totalGroups += dups.length;
    console.log(`\n  ⚠️  ${table}: ${dups.length} 组重复`);
    const soft = await hasDeleted(conn, table);

    for (const g of dups) {
      const where = cols.map((c) => `\`${c}\` = ${conn.escape(g[c])}`).join(' AND ');
      const [rows] = await conn.query(`SELECT id FROM \`${table}\` WHERE ${where} ORDER BY id`);
      const keepId = rows[rows.length - 1].id;
      const extras = rows.slice(0, -1).map((r) => r.id);
      totalDupRows += rows.length;
      console.log(
        `     key(${colList})=${cols.map((c) => g[c]).join('|')} -> ${rows.length} 行, 保留 id=${keepId}, 处理 ${extras.length} 行`
      );
      if (FIX && extras.length) {
        if (soft) {
          await conn.query(`UPDATE \`${table}\` SET deleted = 1 WHERE id IN (?)`, [extras]);
        } else {
          await conn.query(`DELETE FROM \`${table}\` WHERE id IN (?)`, [extras]);
        }
        fixRows += extras.length;
      }
    }
  }

  console.log(`\n📊 汇总: ${totalGroups} 组重复 / ${totalDupRows} 行涉及`);
  if (FIX) console.log(`🧹 已处理 ${fixRows} 行（含 deleted 表软删、其余物理删）`);
  else console.log('💡 未修改数据；如需清洗请加 --fix 参数');

  await conn.end();
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
