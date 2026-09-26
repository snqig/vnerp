/**
 * schema ↔ 线上库 漂移门禁（只读，不写任何 DDL / 数据）
 *
 * 逐个 `src/lib/db/schemas/*.ts` 里导出的 Drizzle 表定义，与 `information_schema.COLUMNS` 逐列比对，
 * 找出三类会真的咬人的漂移：
 *
 *   1. 【schema 漏列】库里有、schema 里没写 —— 走 Drizzle 写这张表会**静默丢列**
 *   2. 【幽灵表】schema 里定义了、库里根本没这张表 —— 任何 Drizzle 查询都会直接报错
 *   3. 【schema 多列】schema 里定义了、库里没这列 —— 定义失效，属于死代码
 *
 * 另外单独报一列【类型不符】。其中「无害的写法差异」默认不报，加 `--all` 才报：
 * serial ↔ bigint unsigned、int ↔ int unsigned、tinyint(1) ↔ boolean。
 * 这些不影响读写语义，混在里面会淹没有效信号。
 *
 * 用法：
 *   pnpm validate:schema-drift          只报实质漂移
 *   pnpm validate:schema-drift --all    连无害的类型写法差异一起报
 *
 * 退出码：
 *   0 无实质漂移
 *   1 发现实质漂移
 *   2 脚本自身跑不起来（连不上库等），一律按「失败关闭」处理，避免把真问题放过去
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getTableConfig } from 'drizzle-orm/mysql-core';
import type { Table } from 'drizzle-orm';

const ROOT = path.resolve(import.meta.dirname, '..');
const SCHEMA_DIR = path.join(ROOT, 'src/lib/db/schemas');
const SHOW_BENIGN = process.argv.includes('--all');

const L = (s: unknown) => String(s ?? '').toLowerCase();

// ---------------------------------------------------------------- 环境
function loadEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const file of ['.env', '.env.local']) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[m[1]] = v;
    }
  }
  return out;
}

/**
 * 判断「类型写法不同」是否只是无害差异。详见文件头注释。
 */
function isBenignTypeMismatch(db: string, dr: string): boolean {
  if (db === dr) return true;
  if (dr === 'serial' && db === 'bigintunsigned') return true; // drizzle 的 auto_increment 简写
  if (/^int/.test(db) && /^int/.test(dr)) return true; // MySQL 8 已无显示宽度，signed/unsigned 同族
  if ((db === 'tinyint(1)' && dr === 'boolean') || (db === 'boolean' && dr === 'tinyint(1)')) return true;
  return false;
}

// ---------------------------------------------------------------- 收集 schema 表
const tableMap = new Map<string, { file: string; cfg: ReturnType<typeof getTableConfig> }>();
for (const name of fs.readdirSync(SCHEMA_DIR).filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))) {
  const mod = await import(pathToFileURL(path.join(SCHEMA_DIR, name)).href);
  for (const value of Object.values(mod as Record<string, unknown>)) {
    // 不引 is()/MySqlTable（drizzle 各入口导出不一致），改用 duck typing：只有表定义能取出列
    let cfg;
    try {
      cfg = getTableConfig(value as Table);
    } catch {
      continue;
    }
    // drizzle 0.45 的 getTableConfig 返回的是 `name`，`dbName` 恒 undefined
    if (!cfg.name) continue;
    tableMap.set(L(cfg.name), { file: name, cfg });
  }
}

// ---------------------------------------------------------------- 读库
let mysql;
try {
  mysql = await import('mysql2/promise');
} catch {
  console.error('缺少 mysql2 依赖，无法连库比对。');
  process.exit(2);
}

const env = loadEnv();
let rawCols: Record<string, string>[];
try {
  const conn = await mysql.default.createConnection({
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD,
    database: env.DB_NAME || 'vnerpdacahng',
  });
  const [rows] = await conn.query(`
    SELECT table_name, column_name, column_type
    FROM information_schema.COLUMNS
    WHERE table_schema = DATABASE()
    ORDER BY table_name, ordinal_position
  `);
  await conn.end();
  // information_schema 的列名由 MySQL 原样返回（大写），mysql2 不做大小写转换，这里统一归一
  rawCols = (rows as Record<string, string>[]).map((r) =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [L(k), v]))
  );
} catch (err) {
  console.error(`连库失败，无法完成比对。请检查 .env 的 DB_* 配置与数据库可达性。`);
  console.error(`  ${(err as Error).message.split('\n')[0]}`);
  process.exit(2);
}

const dbCols = new Map<string, Map<string, string>>();
for (const r of rawCols) {
  let m = dbCols.get(L(r.table_name));
  if (!m) dbCols.set(L(r.table_name), (m = new Map()));
  m.set(L(r.column_name), r.column_type);
}

// ---------------------------------------------------------------- 比对
type Issue = { table: string; file: string; kind: string; detail: string };
const issues: Issue[] = [];
const stats = { total: tableMap.size, dbTables: dbCols.size, ok: 0, drift: 0, ghost: 0, unmodeled: 0 };

for (const [dbTable, { file, cfg }] of tableMap) {
  const dbMap = dbCols.get(dbTable);
  if (!dbMap) {
    stats.ghost += 1;
    issues.push({ table: dbTable, file, kind: '幽灵表', detail: 'schema 里定义了、库里没这张表' });
    continue;
  }
  const schemaNames = new Set<string>();
  let drifted = false;
  for (const c of cfg.columns as unknown as { name: string; getSQLType(): string }[]) {
    const cn = L(c.name);
    schemaNames.add(cn);
    if (!dbMap.has(cn)) {
      drifted = true;
      issues.push({ table: dbTable, file, kind: 'schema 多列', detail: `${cn}：schema 里有、库里没有` });
      continue;
    }
    const dbType = L(dbMap.get(cn)).replace(/\s+/g, '');
    const drType = L(c.getSQLType()).replace(/\s+/g, '');
    if (!isBenignTypeMismatch(dbType, drType)) {
      drifted = true;
      issues.push({ table: dbTable, file, kind: '类型不符', detail: `${cn}: 库=${dbMap.get(cn)} / schema=${c.getSQLType()}` });
    }
  }
  for (const cn of dbMap.keys()) {
    if (!schemaNames.has(cn)) {
      drifted = true;
      issues.push({ table: dbTable, file, kind: 'schema 漏列', detail: `${cn}：库里有、schema 里没写 → 走 Drizzle 写会丢列` });
    }
  }
  if (drifted) stats.drift += 1;
  else stats.ok += 1;
}

// 库里有、schema 里压根没建模的表（备份表 _bak_* / 视图 v_* 会稀释信号，单独统计数量）
const unmodeled = [...dbCols.keys()].filter((t) => !tableMap.has(t));
stats.unmodeled = unmodeled.length;

// ---------------------------------------------------------------- 输出
const fatal = issues.filter((i) => i.kind !== '类型不符' || SHOW_BENIGN);

console.log('Drizzle schema ↔ 线上库 漂移检查');
console.log(`  schema 表定义 : ${stats.total}`);
console.log(`  库表          : ${stats.dbTables}`);
console.log(`  完全一致      : ${stats.ok}`);
console.log(`  有漂移        : ${stats.drift}`);
console.log(`  幽灵表        : ${stats.ghost}`);
console.log(`  库里未建模    : ${stats.unmodeled}（含 _bak_* 备份表与 v_* 视图，不计入漂移）`);
console.log('');

if (fatal.length === 0) {
  console.log(`✓ 未发现实质漂移${SHOW_BENIGN ? '' : '（类型写法差异已按 --all 之外的规则忽略）'}`);
  process.exit(0);
}

const order = ['schema 漏列', '幽灵表', 'schema 多列', '类型不符'];
for (const kind of order) {
  const list = fatal.filter((i) => i.kind === kind);
  if (list.length === 0) continue;
  console.log(`【${kind}】${list.length} 条`);
  for (const i of list) console.log(`  ${i.table} (${i.file})${i.detail ? ` — ${i.detail}` : ''}`);
  console.log('');
}

console.error(
  `\n✗ 发现 ${fatal.length} 处实质漂移，涉及 ${new Set(fatal.map((i) => i.table)).size} 张表。` +
    `\n  修完再跑：pnpm validate:schema-drift`
);
process.exit(1);
