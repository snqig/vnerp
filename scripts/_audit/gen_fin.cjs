// fin_ 域补全生成器：生成 9 张未建模核心 fin_* 表到 _gen_fin.ts
// 复用列/类型/索引/拓扑排序逻辑。内部 FK（fin_* → 已建模/待生成 fin_*）实写；跨域 FK 注释保留。
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const envPath = path.resolve(__dirname, '..', '..', '.env');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

// 2 张已建模 fin_*（finance.ts）
const MODELED = new Set(['fin_receivable', 'fin_payable']);
const MODELED_EXPORTS = { fin_receivable: 'finReceivable', fin_payable: 'finPayable' };
const MODELED_FILE = { finReceivable: './finance', finPayable: './finance' };

const TARGET = [
  'fin_account', 'fin_account_balance', 'fin_cost_record', 'fin_payment_record',
  'fin_period', 'fin_receipt_record', 'fin_receivable_line', 'fin_voucher', 'fin_voucher_line',
];

const camel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
const exportName = (t) => 'fin' + camel(t.replace(/^fin_/, '')).replace(/^\w/, c => c.toUpperCase());

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

(async () => {
  const conn = await mysql.createConnection({
    host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER,
    password: env.DB_PASSWORD, database: env.DB_NAME,
  });
  const db = env.DB_NAME;

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

  const knownFin = new Set([...MODELED, ...TARGET]);

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

  const needImports = {};
  for (const t of TARGET) {
    for (const r of fkMap[t] || []) {
      const gt = r.REFERENCED_TABLE_NAME;
      if (MODELED.has(gt)) needImports[MODELED_EXPORTS[gt]] = MODELED_FILE[MODELED_EXPORTS[gt]];
    }
  }

  const lines = [];
  lines.push("// AUTO-GENERATED by scripts/_audit/gen_fin.cjs (2026-08-26)");
  lines.push("// 来源: live information_schema. 建模 9 张核心 fin_* 缺失表。");
  lines.push("// 跨域 FK / 自引用 FK 以注释保留；内部 fin_* FK 实写。");
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
    const exportN = exportName(t);
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
      const refObj = MODELED.has(g.refTable) ? MODELED_EXPORTS[g.refTable] : exportName(g.refTable);
      const cols = g.cols.map(c => `t.${c}`).join(', ');
      const refCols = g.refCols.map(c => `${refObj}.${c}`).join(', ');
      if (knownFin.has(g.refTable)) {
        extra.push(`  ${camel(cname)}: foreignKey({ columns: [${cols}], foreignColumns: [${refCols}] }),`);
        fkEmitted++;
      } else {
        lines.push(`// SKIP-FK (cross-domain): ${t}.${g.cols.join(',')} -> ${g.refTable}.${g.refCols.join(',')} [${g.del ? g.del : ''}/${g.upd ? g.upd : ''}]`);
        fkSkipped++;
      }
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
  const target = path.resolve(__dirname, '..', '..', 'src', 'lib', 'db', 'schemas', '_gen_fin.ts');
  fs.writeFileSync(target, out + '\n', 'utf8');
  console.log(`写入: ${target}`);
  console.log(`内部 FK 已生成 = ${fkEmitted}, 跳过(自引用/跨域) = ${fkSkipped}`);
  console.log(`需 import 已建模导出: ${JSON.stringify(needImports)}`);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
