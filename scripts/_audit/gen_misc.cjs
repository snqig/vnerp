// 通用批处理生成器：为指定域生成 _gen_<domain>.ts（建模该域未建模核心表）
// 用法: node scripts/_audit/gen_misc.cjs <domain>
// 通用能力：
//   ① 扫描全部 schemas/*.ts 构建全局 导出名→表名→文件 注册表（用于 FK import + 冲突检测）
//   ② 自动规避导出名冲突：派生名若已存在/同批占用，追加 "Gen" 后缀
//   ③ 内部 FK（同批内或已建模表）实写并自动 import；跨域 FK 注释保留
//   ④ 拓扑排序保证父表在前
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const envPath = path.resolve(__dirname, '..', '..', '.env');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const SCHEMAS_DIR = path.resolve(__dirname, '..', '..', 'src', 'lib', 'db', 'schemas');

// ── 全局注册表：扫描所有 schema 文件 ──
function buildGlobalRegistry() {
  const reg = { tableNameToExport: {}, exportNameToFile: {}, exportNameToTable: {} };
  for (const f of fs.readdirSync(SCHEMAS_DIR)) {
    if (!f.endsWith('.ts')) continue;
    const file = f.replace(/\.ts$/, '');
    const src = fs.readFileSync(path.join(SCHEMAS_DIR, f), 'utf8');
    const re = /export\s+const\s+(\w+)\s*=\s*mysqlTable\(\s*'([\w]+)'/g;
    let m;
    while ((m = re.exec(src))) {
      reg.exportNameToTable[m[1]] = m[2];
      reg.tableNameToExport[m[2]] = m[1];
      reg.exportNameToFile[m[1]] = './' + file;
    }
  }
  return reg;
}

const camel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
const deriveExport = (t, used) => {
  const seg = camel(t.replace(/^[^_]+_/, ''));
  const segCap = seg.charAt(0).toUpperCase() + seg.slice(1); // 仅大写段首，前缀保持小写（sysAnnouncement 风格）
  let base = t.split('_')[0] + segCap;
  let name = base, i = 2;
  while (used.has(name) || (globalReg.exportNameToTable[name] !== undefined && globalReg.exportNameToTable[name] !== t)) {
    name = base + 'Gen' + (i++);
  }
  return name;
};

function parseType(ct) {
  const m = ct.match(/^(\w+)(?:\(([^)]*)\))?\s*(unsigned)?/i);
  return { base: (m[1] || '').toLowerCase(), args: m[2] || '', unsigned: !!m[3] };
}
function fmtDefault(base, def) {
  if (def === null || def === undefined) return '';
  const s = String(def);
  if (/^current_timestamp$/i.test(s)) return `.default(sql\`CURRENT_TIMESTAMP\`)`;
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const numericNumber = ['int','bigint','smallint','mediumint','tinyint','float','double'];
    return numericNumber.includes(base) ? `.default(${s})` : `.default('${s}')`;
  }
  if (/^'.*'$/.test(s)) return `.default(${s})`;
  if (/[()]/i.test(s)) return `.default(sql\`${s}\`)`;
  return `.default('${s.replace(/'/g, "\\'")}')`;
}
function colBuilder(col, ct, nullable, extra, def) {
  const { base, args, unsigned } = parseType(ct);
  let b;
  switch (base) {
    case 'int': b = `int('${col}'${unsigned ? ', { unsigned: true }' : ''})`; break;
    case 'bigint': b = `bigint('${col}', { mode: 'number'${unsigned ? ', unsigned: true' : ''} })`; break;
    case 'smallint': b = `smallint('${col}'${unsigned ? ', { unsigned: true }' : ''})`; break;
    case 'mediumint': b = `mediumint('${col}'${unsigned ? ', { unsigned: true }' : ''})`; break;
    case 'tinyint': b = `tinyint('${col}'${unsigned ? ', { unsigned: true }' : ''})`; break;
    case 'varchar': { const len = (args.match(/\d+/) || [255])[0]; b = `varchar('${col}', { length: ${len} })`; break; }
    case 'char': { const len = (args.match(/\d+/) || [1])[0]; b = `char('${col}', { length: ${len} })`; break; }
    case 'decimal': case 'numeric': { const [p, s] = args.split(',').map(x => x.trim()); b = `decimal('${col}', { precision: ${p}, scale: ${s || 0} })`; break; }
    case 'float': b = `float('${col}')`; break;
    case 'double': b = `double('${col}')`; break;
    case 'text': case 'mediumtext': case 'longtext': case 'tinytext': b = `text('${col}')`; break;
    case 'date': b = `date('${col}')`; break;
    case 'datetime': b = `datetime('${col}')`; break;
    case 'timestamp': b = `timestamp('${col}')`; break;
    case 'time': b = `time('${col}')`; break;
    case 'json': b = `json('${col}')`; break;
    case 'enum': { const vals = args.match(/'[^']*'/g); b = `mysqlEnum('${col}', [${vals.join(', ')}] as const)`; break; }
    default: b = `text('${col}') /* UNMAPPED TYPE: ${ct} */`; break;
  }
  let out = b;
  if (extra && /auto_increment/i.test(extra)) out += '.autoincrement()';
  if (nullable === 'NO') out += '.notNull()';
  out += fmtDefault(base, def);
  return out;
}

const domain = process.argv[2];
if (!domain) { console.error('用法: node gen_misc.cjs <domain>'); process.exit(1); }
const globalReg = buildGlobalRegistry();

(async () => {
  const conn = await mysql.createConnection({
    host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER,
    password: env.DB_PASSWORD, database: env.DB_NAME,
  });
  const db = env.DB_NAME;

  // 取该域未建模核心表（来自 live，过滤前缀）
  const [all] = await conn.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME LIKE ? ORDER BY TABLE_NAME`,
    [db, domain + '_%']);
  const TARGET = all.map(r => r.TABLE_NAME).filter(t => !globalReg.tableNameToExport[t]); // 排除已建模
  if (TARGET.length === 0) { console.log(`域 ${domain} 无未建模核心表，跳过`); await conn.end(); process.exit(0); }

  const used = new Set(); // 本批已用导出名
  const exportOf = {};    // tableName -> exportName（用于 FK 引用）
  for (const t of TARGET) { exportOf[t] = deriveExport(t, used); used.add(exportOf[t]); }

  const colMap = {}, idxMap = {}, fkMap = {};
  for (const t of TARGET) {
    const [c] = await conn.query(`SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION`, [db, t]);
    colMap[t] = c;
    const [i] = await conn.query(`SELECT INDEX_NAME, NON_UNIQUE, COLUMN_NAME, SEQ_IN_INDEX FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY INDEX_NAME, SEQ_IN_INDEX`, [db, t]);
    idxMap[t] = i;
    const [f] = await conn.query(`SELECT k.CONSTRAINT_NAME, k.COLUMN_NAME, k.REFERENCED_TABLE_NAME, k.REFERENCED_COLUMN_NAME, r.DELETE_RULE, r.UPDATE_RULE FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON k.CONSTRAINT_NAME=r.CONSTRAINT_NAME AND k.TABLE_SCHEMA=r.CONSTRAINT_SCHEMA WHERE k.TABLE_SCHEMA=? AND k.TABLE_NAME=? AND k.REFERENCED_TABLE_NAME IS NOT NULL`, [db, t]);
    fkMap[t] = f;
  }
  await conn.end();

  const knownAll = new Set([...Object.keys(globalReg.tableNameToExport), ...TARGET]);

  const deps = {};
  for (const t of TARGET) {
    deps[t] = new Set();
    for (const r of fkMap[t] || []) {
      const gt = r.REFERENCED_TABLE_NAME;
      if (gt !== t && TARGET.includes(gt)) deps[t].add(gt);
    }
  }
  const indeg = {}; TARGET.forEach(t => indeg[t] = deps[t].size);
  const q = TARGET.filter(t => indeg[t] === 0);
  const ordered = [], seen = new Set();
  while (q.length) {
    const t = q.shift(); ordered.push(t); seen.add(t);
    for (const t2 of TARGET) if (deps[t2].has(t)) { indeg[t2]--; if (indeg[t2] === 0) q.push(t2); }
  }
  for (const t of TARGET) if (!seen.has(t)) ordered.push(t);

  // 收集 FK import（引用已建模表）
  const needImports = {}; // exportName -> file
  for (const t of TARGET) {
    for (const r of fkMap[t] || []) {
      const gt = r.REFERENCED_TABLE_NAME;
      const ex = globalReg.tableNameToExport[gt];
      if (ex && !TARGET.includes(gt)) needImports[ex] = globalReg.exportNameToFile[ex];
    }
  }

  const lines = [];
  lines.push(`// AUTO-GENERATED by scripts/_audit/gen_misc.cjs (2026-08-26)`);
  lines.push(`// 域: ${domain} ｜ 来源: live information_schema ｜ 建模 ${TARGET.length} 张核心缺失表。`);
  lines.push(`// 导出名冲突自动规避（追加 Gen 后缀）；跨域 FK 注释保留；内部/已建模 FK 实写。`);
  lines.push("import { mysqlTable, int, bigint, smallint, mediumint, tinyint, varchar, char, decimal, float, double, text, date, datetime, timestamp, time, json, mysqlEnum, primaryKey, index, uniqueIndex, foreignKey } from 'drizzle-orm/mysql-core';");
  lines.push("import { sql } from 'drizzle-orm';");
  {
    const byFile = {};
    for (const [name, file] of Object.entries(needImports)) { (byFile[file] = byFile[file] || []).push(name); }
    for (const [file, names] of Object.entries(byFile)) lines.push(`import { ${names.join(', ')} } from '${file}';`);
  }
  lines.push('');

  let fkEmitted = 0, fkSkipped = 0;
  for (const t of ordered) {
    const exportN = exportOf[t];
    const colDefs = colMap[t].map(c => `  ${camel(c.COLUMN_NAME)}: ${colBuilder(c.COLUMN_NAME, c.COLUMN_TYPE, c.IS_NULLABLE, c.EXTRA, c.COLUMN_DEFAULT)},`);

    const idxGroups = {};
    for (const r of idxMap[t]) {
      if (r.INDEX_NAME.toLowerCase().startsWith('fk_')) continue;
      idxGroups[r.INDEX_NAME] = idxGroups[r.INDEX_NAME] || { nonUnique: r.NON_UNIQUE, cols: [] };
      idxGroups[r.INDEX_NAME].cols.push(camel(r.COLUMN_NAME));
    }
    const extra = [];
    for (const [name, g] of Object.entries(idxGroups)) {
      const cols = g.cols.map(c => `t.${c}`).join(', ');
      if (name === 'PRIMARY') extra.push(`  pk: primaryKey({ columns: [${cols}] }),`);
      else if (g.nonUnique === 0) extra.push(`  ${camel(name)}: uniqueIndex('${name}').on(${cols}),`);
      else extra.push(`  ${camel(name)}: index('${name}').on(${cols}),`);
    }
    const fkGroups = {};
    for (const r of fkMap[t]) {
      fkGroups[r.CONSTRAINT_NAME] = fkGroups[r.CONSTRAINT_NAME] || { refTable: r.REFERENCED_TABLE_NAME, refCol: r.REFERENCED_COLUMN_NAME, cols: [], refCols: [] };
      fkGroups[r.CONSTRAINT_NAME].cols.push(camel(r.COLUMN_NAME));
      fkGroups[r.CONSTRAINT_NAME].refCols.push(camel(r.REFERENCED_COLUMN_NAME));
    }
    for (const [cname, g] of Object.entries(fkGroups)) {
      if (g.refTable === t) { lines.push(`// SKIP-FK (self-ref): ${t}.${g.cols.join(',')} -> ${t}.${g.refCols.join(',')}`); fkSkipped++; continue; }
      const refObj = TARGET.includes(g.refTable) ? exportOf[g.refTable] : (globalReg.tableNameToExport[g.refTable] || null);
      if (!refObj) { // 跨域未建模
        lines.push(`// SKIP-FK (cross-domain): ${t}.${g.cols.join(',')} -> ${g.refTable}.${g.refCols.join(',')} [${g.del ? g.del : ''}/${g.upd ? g.upd : ''}]`);
        fkSkipped++; continue;
      }
      const cols = g.cols.map(c => `t.${c}`).join(', ');
      const refCols = g.refCols.map(c => `${refObj}.${c}`).join(', ');
      extra.push(`  ${camel(cname)}: foreignKey({ columns: [${cols}], foreignColumns: [${refCols}] }),`);
      fkEmitted++;
    }

    lines.push(`export const ${exportN} = mysqlTable('${t}', {`);
    lines.push(...colDefs);
    if (extra.length) {
      lines.push(`}, (t) => ({`);
      lines.push(...extra);
      lines.push(`}));`);
    } else {
      lines.push(`});`);
    }
    lines.push('');
  }

  const out = lines.join('\n');
  const target = path.join(SCHEMAS_DIR, `_gen_${domain}.ts`);
  fs.writeFileSync(target, out + '\n', 'utf8');
  console.log(`写入: ${target}`);
  console.log(`表数: ${TARGET.length} ｜ 导出名: ${TARGET.map(t=>exportOf[t]).join(', ')}`);
  console.log(`内部/已建模 FK 已生成 = ${fkEmitted}, 跳过(自引用/跨域) = ${fkSkipped}`);
  console.log(`需 import 已建模导出: ${JSON.stringify(needImports)}`);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
