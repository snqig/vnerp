#!/usr/bin/env node
/**
 * safe-db-push.cjs — Drizzle push 安全护栏（DATA-001 高危消除）
 *
 * 为什么需要它：
 *   本仓库 Drizzle 仅建模全库约 150/229 张表。裸 `drizzle-kit push` 会把
 *   "Drizzle 不认识的" live 表 / 列 / 外键全部 DROP 掉 —— 灾难性数据丢失。
 *   此脚本在真正 push 之前做只读 introspection，检测任何 DROP 风险，命中即 abort。
 *
 * 检测项（命中任意一项即拒绝 push）：
 *   1. 弃表风险：live 存在但 Drizzle 未建模的表        → DROP TABLE
 *   2. 弃列风险：已建模表在 live 有、Drizzle 缺失的列  → DROP COLUMN
 *   3. 弃键风险：已建模表在 live 有、指向未建模表的 FK → DROP FOREIGN KEY
 *
 * 仅当三项全清（Drizzle 是 live 的超集，只会产生 ADD）才放行 push。
 * 本仓库现状下三项必命中 → 永远 abort，并提示改用增量迁移 scripts/migrate.ts。
 *
 * 用法：node scripts/safe-db-push.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ---- 1. 读取 .env（不依赖 dotenv，避免额外依赖） ----
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  for (const raw of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}

const mysql = require('mysql2/promise');

// ---- 2. 解析 Drizzle schema，得到「已建模表」与「每表列名集合」 ----
const SCHEMA_DIR = path.resolve(process.cwd(), 'src/lib/db/schemas');
const COLUMN_TYPES = [
  'varchar', 'char', 'text', 'tinytext', 'mediumtext', 'longtext',
  'int', 'integer', 'smallint', 'mediumint', 'bigint', 'tinyint',
  'decimal', 'numeric', 'float', 'double', 'real',
  'date', 'datetime', 'timestamp', 'time', 'year', 'boolean',
  'mysqlEnum', 'json', 'binary', 'varbinary', 'mysqlVarBinary',
].join('|');
const COL_TYPE_RE = new RegExp('\\b(' + COLUMN_TYPES + ')\\(\\s*[\'"]?([A-Za-z0-9_]+)', 'g');

function extractBlocks(src) {
  const blocks = [];
  const tableRe = /mysqlTable\(\s*['"]([^'"]+)'/g;
  let m;
  while ((m = tableRe.exec(src))) {
    const tableName = m[1];
    // 找到 mysqlTable( 之后的第一个 { 并匹配到平衡 }
    let i = m.index + m[0].length;
    let brace = -1;
    while (i < src.length) {
      if (src[i] === '{') { brace = i; break; }
      if (src[i] === ')' ) break; // 无 body（极少见）
      i++;
    }
    if (brace === -1) continue;
    let depth = 0, j = brace;
    for (; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') { depth--; if (depth === 0) break; }
    }
    blocks.push({ table: tableName, body: src.slice(brace + 1, j) });
  }
  return blocks;
}

function parseSchema() {
  const modeledTables = new Set();
  const tableColumns = new Map(); // table -> Set<colName>
  const files = fs.readdirSync(SCHEMA_DIR).filter((f) => f.endsWith('.ts'));
  for (const f of files) {
    const src = fs.readFileSync(path.join(SCHEMA_DIR, f), 'utf8');
    for (const { table, body } of extractBlocks(src)) {
      modeledTables.add(table);
      const cols = new Set();
      let cm;
      const re = new RegExp(COL_TYPE_RE);
      while ((cm = re.exec(body))) {
        cols.add(cm[2]);
      }
      // 兜底：无显式列名的属性（如 `version: int()`）以属性名作为列名
      const propRe = /(\w+)\s*:\s*(?:'[^']*'|"[^"]*"|\d+|sql`[^`]*`|\{[^}]*\}|\[[^\]]*\]|[A-Za-z_][\w]*\([^)]*\))\s*,/g;
      // 仅取「属性: 类型调用(...)」形式，类型调用首词为列类型
      const propRe2 = new RegExp('(\\w+)\\s*:\\s*(' + COLUMN_TYPES + ')\\s*\\(', 'g');
      let pm;
      while ((pm = propRe2.exec(body))) {
        cols.add(pm[1]);
      }
      if (!tableColumns.has(table)) tableColumns.set(table, new Set());
      for (const c of cols) tableColumns.get(table).add(c);
    }
  }
  return { modeledTables, tableColumns };
}

// ---- 3. 主流程 ----
(async () => {
  const { modeledTables, tableColumns } = parseSchema();

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vnerpdacahng',
  });
  const db = process.env.DB_NAME || 'vnerpdacahng';

  const [tblRows] = await conn.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`, [db]);
  const liveTables = new Set(tblRows.map((r) => r.TABLE_NAME));

  const problems = [];
  const unmappedTables = [...liveTables].filter((t) => !modeledTables.has(t));
  if (unmappedTables.length) {
    problems.push({
      level: 'DROP TABLE',
      detail: `live 有 ${unmappedTables.length} 张表未被 Drizzle 建模，push 会整表 DROP（及其全部数据）`,
      sample: unmappedTables.slice(0, 25),
    });
  }

  // 已建模且 live 也存在的表：检查弃列 / 弃键
  const mapped = [...modeledTables].filter((t) => liveTables.has(t));
  for (const t of mapped) {
    const [colRows] = await conn.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`, [db, t]);
    const liveCols = new Set(colRows.map((r) => r.COLUMN_NAME));
    const drizCols = tableColumns.get(t) || new Set();
    const droppedCols = [...liveCols].filter((c) => !drizCols.has(c));
    if (droppedCols.length) {
      problems.push({
        level: 'DROP COLUMN',
        detail: `表 ${t}: live 有 ${droppedCols.length} 列在 Drizzle 中缺失，push 会 DROP 这些列`,
        sample: droppedCols.slice(0, 25),
      });
    }
    // FK：引用了未建模表 → push 会 DROP 该外键
    const [fkRows] = await conn.query(
      `SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`, [db, t]);
    const droppedFks = fkRows.filter((r) => !modeledTables.has(r.REFERENCED_TABLE_NAME));
    if (droppedFks.length) {
      problems.push({
        level: 'DROP FOREIGN KEY',
        detail: `表 ${t}: ${droppedFks.length} 个外键指向未建模表（${[...new Set(droppedFks.map((r) => r.REFERENCED_TABLE_NAME))].join(', ')}），push 会 DROP 这些外键`,
        sample: droppedFks.map((r) => `${r.CONSTRAINT_NAME}->${r.REFERENCED_TABLE_NAME}`).slice(0, 25),
      });
    }
  }
  await conn.end();

  // ---- 4. 报告 ----
  console.log('══════════════════════════════════════════════════════════');
  console.log(' safe-db-push 护栏检查');
  console.log('══════════════════════════════════════════════════════════');
  console.log(` Drizzle 已建模表 : ${modeledTables.size}`);
  console.log(` live 实际表      : ${liveTables.size}`);
  console.log(` 二者交集(待校验) : ${mapped.length}`);

  if (problems.length === 0) {
    console.log('\n✅ 未发现任何 DROP 风险，Drizzle 是 live 的超集，放行 push。\n');
    try {
      execSync('pnpm dlx drizzle-kit push', { stdio: 'inherit' });
    } catch (e) {
      console.error('\n❌ drizzle-kit push 执行失败（见上方输出）');
      process.exit(1);
    }
    process.exit(0);
  }

  console.log(`\n🚨 检测到 ${problems.length} 类 DROP 风险，已拒绝 push：\n`);
  for (const p of problems) {
    console.log(`  [${p.level}] ${p.detail}`);
    if (p.sample && p.sample.length) {
      console.log('     示例: ' + p.sample.join(', '));
    }
  }
  console.log('\n══════════════════════════════════════════════════════════');
  console.log(' 结论：本仓库 Drizzle 仅为全库子集，裸 push 会丢数据。');
  console.log(' 如需结构变更，请使用增量迁移：');
  console.log('   pnpm migrate        # 执行 database/migrations/*.ts');
  console.log('   pnpm db:studio      # 仅可视化查看（只读）');
  console.log(' 若确须结构变更，请使用增量迁移：pnpm migrate');
  console.log('══════════════════════════════════════════════════════════');
  process.exit(1);
})().catch((e) => {
  console.error('safe-db-push 执行异常:', e.message);
  process.exit(2);
});
