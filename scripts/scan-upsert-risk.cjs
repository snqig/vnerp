#!/usr/bin/env node
/**
 * F-011 / R4 精准扫描：只针对「维度组合唯一键」表的非原子 INSERT
 *
 * 关键区分（避免 145 个误报）：
 *  - 单号类唯一键（uk_record_no / uk_card_no 等，单列且以 _no/_code 结尾）
 *    → 单据号由 generateDocumentNo 用 GET_LOCK 串行生成，不并发、无软删复活场景，安全。
 *  - 维度组合键（uk_material_warehouse(material_id,warehouse_id) 等）
 *    → 唯一键不含 deleted，软删行仍占位；「先 SELECT 后 INSERT」会撞 Duplicate entry
 *      并导致整事务回滚。这才是 R4 的真实靶子，必须改 INSERT ... ON DUPLICATE KEY UPDATE。
 *
 * 只读。用法：node scripts/scan-upsert-risk.cjs
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const CONN = {
  host: '127.0.0.1',
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
};

const SCAN_DIRS = ['src/app/api', 'src/application', 'src/infrastructure', 'src/lib'];

function walk(dir) {
  const out = [];
  const abs = path.join(process.cwd(), dir);
  if (!fs.existsSync(abs)) return out;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(rel));
    else if (e.name.endsWith('.ts') && !e.name.endsWith('.test.ts')) out.push(rel);
  }
  return out;
}

function collectFiles() {
  const out = [];
  for (const d of SCAN_DIRS) out.push(...walk(d));
  return out;
}

/** 加载「维度组合键」风险表（排除含 deleted 的单号类键） */
async function loadRiskyTables(conn) {
  const [rows] = await conn.query(
    `SELECT s.TABLE_NAME, s.INDEX_NAME,
            GROUP_CONCAT(s.COLUMN_NAME ORDER BY s.SEQ_IN_INDEX) AS cols
     FROM information_schema.STATISTICS s
     WHERE s.TABLE_SCHEMA = DATABASE() AND s.NON_UNIQUE = 0 AND s.INDEX_NAME <> 'PRIMARY'
     GROUP BY s.TABLE_NAME, s.INDEX_NAME`
  );
  const risky = new Map();
  for (const r of rows) {
    const cols = String(r.cols).split(',');
    if (cols.some((c) => /deleted|is_deleted/i.test(c))) continue;
    const isDocNoKey = cols.length === 1 && /_(no|code)$/i.test(cols[0]);
    if (isDocNoKey) continue;
    // 排除备份表
    if (/_bak_/i.test(r.TABLE_NAME)) continue;
    const key = `${r.INDEX_NAME}(${cols.join('+')})`;
    if (!risky.has(r.TABLE_NAME)) risky.set(r.TABLE_NAME, []);
    risky.get(r.TABLE_NAME).push(key);
  }
  return risky;
}

async function main() {
  const conn = await mysql.createConnection(CONN);
  let risky;
  try {
    risky = await loadRiskyTables(conn);
  } finally {
    await conn.end();
  }

  const files = collectFiles();
  console.log('===== F-011 / R4 精准扫描 =====');
  console.log(`扫描文件 ${files.length} 个`);
  console.log(`维度组合唯一键表（真实 R4 风险）: ${risky.size} 张\n`);

  const biz = [];
  const skippedUpsert = [];

  for (const f of files) {
    const src = fs.readFileSync(path.join(process.cwd(), f), 'utf8');
    for (const [table, keys] of risky) {
      const re = new RegExp('INSERT\\s+(?:IGNORE\\s+)?INTO\\s+`?' + table + '`?\\b', 'i');
      if (!re.test(src)) continue;

      const norm = f.replace(/\\/g, '/');
      // 排除一次性 init/seed/migration 路由
      if (/\/(init|migrations)\//.test(norm) || /seed|migrat/i.test(norm)) continue;

      if (/ON\s+DUPLICATE\s+KEY\s+UPDATE/i.test(src)) {
        skippedUpsert.push(`${norm} -> ${table}`);
      } else {
        biz.push({ file: norm, table, keys });
      }
      break;
    }
  }

  console.log(`已用 UPSERT 保护（安全）: ${skippedUpsert.length} 处`);
  console.log(`待修复（非 UPSERT 写入风险表）: ${biz.length} 处\n`);

  if (!biz.length) {
    console.log('✅ 所有维度组合键表的写入均已有 UPSERT 保护。');
    return;
  }

  console.log('----- 待修复明细 -----');
  for (const b of biz) {
    console.log(`\n${b.file}`);
    console.log(`   表: ${b.table}`);
    console.log(`   唯一键: ${b.keys.join(', ')}`);
  }

  console.log('\n----- 修复模板 -----');
  console.log('INSERT INTO <t> (dim1, dim2, qty, deleted) VALUES (?, ?, ?, 0)');
  console.log('ON DUPLICATE KEY UPDATE qty = qty + VALUES(qty), deleted = 0, version = version + 1');
  console.log('\n注：若业务上「已存在则报错」是正确语义（如重复下单应拒绝），');
  console.log('    则保持 INSERT 不变并在此清单标注豁免，不必强行改 UPSERT。');
}

main().catch((e) => {
  console.error('扫描失败:', e.message);
  process.exit(1);
});
