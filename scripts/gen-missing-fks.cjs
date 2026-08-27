/**
 * gen-missing-fks.cjs
 * 把活库(information_schema)中存在、但 Drizzle schema 尚未定义的 FK
 * 以 foreignKey({...}) 形式补齐到对应 schema 文件，并自动补 import。
 *
 * 设计：
 *  - 扫描 src/lib/db/schemas 下所有 .ts，建立 table(snake)->{var,file} 与每张表的列属性集合。
 *  - 解析现有 Drizzle foreignKey({...}) 块，得到「已建模的 (table,col->refTable,refCol)」集合
 *    以及「已存在的 FK 属性名」集合(用于避免重名注入)。
 *  - 查询活库 FK，求缺口。
 *  - 护栏：
 *      a) 自引用 FK (refTable===childTable) 直接跳过——自引用会让 TS 推断进入死循环(TS7022/TS7024)，
 *         本项目原作者在 _gen_material.ts 用 `// SKIP-FK (self-ref)` 注释刻意跳过，这里沿用同一约定。
 *      b) 注入前解析目标表回调里已有的属性名，若生成的 `fk_xxx_y` 已存在则跳过(同名即同目标)，
 *         若与「不同目标但同名」的属性碰撞则追加 _v2/_v3 后缀，杜绝 TS1117。
 *      c) 跨表环检测：若新增边 A->B 会使图出现环(B 已能到达 A)，跳过该 FK，避免推断死循环。
 *  - 幂等：已存在的 FK 不会重复添加。
 *
 * 运行： node scripts/gen-missing-fks.cjs   (DRY_RUN=1 可空跑)
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const SCHEMA_DIR = path.resolve(__dirname, '../src/lib/db/schemas');
const S = 'vnerpdacahng';

// ---------- helpers ----------
function camelToSnake(s) {
  return s.replace(/([A-Z])/g, '_$1').toLowerCase();
}
function snakeToCamel(s) {
  return s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}
function walkDir(d) {
  let out = [];
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) out = out.concat(walkDir(p));
    else if (f.endsWith('.ts')) out.push(p);
  }
  return out;
}
// 跳过字符串/注释的括号匹配，返回与 openIdx 处 '{' 匹配的 '}' 索引
function matchBrace(content, openIdx) {
  let depth = 0;
  let inStr = null;
  for (let i = openIdx; i < content.length; i++) {
    const ch = content[i];
    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { inStr = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}
// 在 FK 块前找到所属 table var
function varNameFromBlockContext(content, fkIdx) {
  const before = content.slice(0, fkIdx);
  const re = /export\s+const\s+(\w+)\s*=\s*mysqlTable\(/g;
  let last = null, mm;
  while ((mm = re.exec(before))) last = mm[1];
  return last;
}
// 找包含 idx 的最近一层回调参数名 (PARAM) => (
function enclosingParam(content, idx) {
  const seg = content.slice(0, idx);
  const re = /\((\w+)\)\s*=>\s*\(/g;
  let last = 'table', mm;
  while ((mm = re.exec(seg))) last = mm[1];
  return last;
}

// ---------- 1. 扫描 schema 文件 ----------
const files = walkDir(SCHEMA_DIR);
const tableToVar = {};      // snake -> { var, file }
const varToTable = {};       // var -> snake
const tableCols = {};        // var -> Set(propName)
const existingDrizzleFK = new Set(); // key: tableSnake|colSnake|refTableSnake|refColSnake
const existingFKNames = {};           // tableVar -> Set(propertyName)

for (const file of files) {
  const t = fs.readFileSync(file, 'utf8');
  // export const VAR = mysqlTable('TABLE', {
  const defRe = /export\s+const\s+(\w+)\s*=\s*mysqlTable\(\s*['"]([\w]+)['"]\s*,\s*\{/g;
  let m;
  while ((m = defRe.exec(t))) {
    const varName = m[1];
    const tableName = m[2];
    tableToVar[tableName] = { var: varName, file };
    varToTable[varName] = tableName;
    const cols = new Set();
    const colRe = /(\w+)\s*:\s*(?:bigint|int|tinyint|smallint|mediumint|varchar|text|decimal|datetime|date|timestamp|time|boolean|bool|json|serial|double|float|year|binary|varbinary|char)\s*\(\s*['"]([\w]+)['"]/g;
    let cm;
    while ((cm = colRe.exec(t))) cols.add(cm[1]);
    tableCols[varName] = cols;
  }
  // 现有 FK
  const fkRe = /foreignKey\(\{/g;
  let fm;
  while ((fm = fkRe.exec(t))) {
    const open = fm.index + fm[0].length - 1;
    const close = matchBrace(t, open);
    if (close < 0) continue;
    const block = t.slice(open, close + 1);
    const param = enclosingParam(t, fm.index);
    const colM = block.match(new RegExp('columns:\\s*\\[\\s*' + param + '\\.(\\w+)\\s*\\]'));
    const refM = block.match(/foreignColumns:\s*\[\s*(\w+)\.(\w+)\s*\]/);
    const childVar = varNameFromBlockContext(t, fm.index);
    // 记录已有 FK 属性名（用于注入时避免重名）。属性名位于 foreignKey( 之前的 `prop:` 尾部。
    const pre = t.slice(Math.max(0, fm.index - 160), fm.index);
    const nm = pre.match(/([A-Za-z_]\w*)\s*:\s*$/);
    if (childVar && nm) {
      (existingFKNames[childVar] = existingFKNames[childVar] || new Set()).add(nm[1]);
    }
    if (colM && refM && childVar) {
      const childTable = varToTable[childVar];
      const refTable = varToTable[refM[1]];
      if (!childTable || !refTable) continue;
      const key = `${childTable}|${camelToSnake(colM[1])}|${refTable}|${camelToSnake(refM[2])}`;
      existingDrizzleFK.add(key);
    }
  }
}

// ---------- 2. 取活库 FK ----------
(async () => {
  const c = await mysql.createConnection({ host: '127.0.0.1', port: 3306, user: 'root', password: 'Snqig521223', database: S });
  const rows = await c.query(`SELECT k.table_name AS table_name, k.column_name AS column_name,
    k.referenced_table_name AS ref_table, k.referenced_column_name AS ref_column,
    k.constraint_name AS constraint_name, r.delete_rule AS delete_rule, r.update_rule AS update_rule
    FROM information_schema.key_column_usage k
    JOIN information_schema.referential_constraints r
      ON k.constraint_name=r.constraint_name AND k.table_schema=r.constraint_schema
    WHERE k.table_schema='${S}' AND k.referenced_table_name IS NOT NULL
    ORDER BY k.table_name, k.constraint_name`);
  await c.end();

  const liveFKs = rows[0];

  // 构建已建模边图(用于环检测)： childTable -> [refTable...]
  const adj = {};
  for (const key of existingDrizzleFK) {
    const [child, , ref] = key.split('|');
    (adj[child] = adj[child] || []).push(ref);
  }
  function canReach(from, to, seen = new Set()) {
    if (from === to) return true;
    if (seen.has(from)) return false;
    seen.add(from);
    for (const n of (adj[from] || [])) if (canReach(n, to, seen)) return true;
    return false;
  }

  const gap = [];
  const skipLog = [];
  for (const fk of liveFKs) {
    const key = `${fk.table_name}|${fk.column_name}|${fk.ref_table}|${fk.ref_column}`;
    if (existingDrizzleFK.has(key)) continue; // 已建模，跳过
    if (fk.ref_table === fk.table_name) {
      skipLog.push({ reason: 'self-ref (skip per convention, TS7022)', fk });
      continue;
    }
    gap.push(fk);
  }

  // 按 文件 -> [fk] 聚合
  const byFile = {};
  const skipped = [];
  for (const fk of gap) {
    const child = tableToVar[fk.table_name];
    const ref = tableToVar[fk.ref_table];
    if (!child || !ref) { skipped.push({ reason: 'table not in drizzle', fk }); continue; }
    const colProp = snakeToCamel(fk.column_name);
    const refColProp = snakeToCamel(fk.ref_column);
    if (!tableCols[child.var].has(colProp)) { skipped.push({ reason: 'child column missing in drizzle', fk, colProp }); continue; }
    // 避免与已有 FK 属性名冲突(同名即同目标)
    if (existingFKNames[child.var] && existingFKNames[child.var].has(`fk_${ref.var}_${colProp}`)) {
      skipped.push({ reason: 'fk name already in drizzle', fk }); continue;
    }
    // 环检测：新增边 child->ref 若使图成环(ref 已能到达 child)则跳过
    if (canReach(fk.ref_table, fk.table_name)) {
      skipLog.push({ reason: 'cross-table cycle (skip, TS7022)', fk });
      continue;
    }
    const rec = {
      varName: child.var, tableName: fk.table_name,
      colProp, refVar: ref.var, refColProp,
      constraintName: fk.constraint_name,
      onDelete: (fk.delete_rule || 'NO ACTION').toLowerCase(),
      onUpdate: (fk.update_rule || 'NO ACTION').toLowerCase(),
    };
    (byFile[child.file] = byFile[child.file] || []).push(rec);
    // 把已接受的新边加入图，供后续候选环检测
    (adj[fk.table_name] = adj[fk.table_name] || []).push(fk.ref_table);
  }
  console.log('LIVE_FK_TOTAL:', liveFKs.length, '| ALREADY_IN_DRIZZLE:', existingDrizzleFK.size, '| GAP:', gap.length);
  console.log('SKIPPED(self-ref/cycle/name):', skipLog.length, '| SKIPPED(other):', skipped.length);
  skipLog.slice(0, 30).forEach(s => console.log('  SKIP', s.reason, `${s.fk.table_name}.${s.fk.column_name}->${s.fk.ref_table}`));
  skipped.slice(0, 20).forEach(s => console.log('  SKIP', s.reason, s.fk ? `${s.fk.table_name}.${s.fk.column_name}->${s.fk.ref_table}` : '', s.colProp || ''));

  // ---------- 3. 注入 ----------
  let applied = 0;
  for (const [file, recs] of Object.entries(byFile)) {
    let content = fs.readFileSync(file, 'utf8');
    const byVar = {};
    for (const r of recs) (byVar[r.varName] = byVar[r.varName] || []).push(r);

    for (const [varName, rawList] of Object.entries(byVar)) {
      // 去重：同一 (表.列->引用表.引用列) 只保留一个（活库重复约束 P2 的情况）
      const seen = new Set();
      const list = [];
      for (const r of rawList) {
        const k = `${r.tableName}|${r.colProp}|${r.refVar}|${r.refColProp}`;
        if (seen.has(k)) continue;
        seen.add(k);
        list.push(r);
      }
      if (list.length === 0) continue;
      const defRe = new RegExp('export\\s+const\\s+' + varName + '\\s*=\\s*mysqlTable\\(\\s*[\'"]' + list[0].tableName + '[\'"]\\s*,\\s*\\{');
      const dm = defRe.exec(content);
      if (!dm) { console.log('  WARN cannot locate', varName); continue; }
      const colsOpen = dm.index + dm[0].length - 1;
      const colsClose = matchBrace(content, colsOpen);
      const after = content.slice(colsClose + 1);
      const cbMatch = after.match(/^\s*,\s*\(\s*(\w+)\s*\)\s*=>\s*\(\s*\{/);
      const cbParam = cbMatch ? cbMatch[1] : 'table';
      let cbOpen, cbClose;
      if (cbMatch) {
        cbOpen = colsClose + cbMatch[0].length;
        cbClose = matchBrace(content, cbOpen);
      } else {
        cbOpen = -1; cbClose = colsClose;
      }

      // 解析回调里已有属性名，避免重名注入(TS1117)
      const cbBody = cbOpen >= 0 ? content.slice(cbOpen + 1, cbClose) : '';
      const existingProps = new Set();
      const propRe = /([A-Za-z_]\w*)\s*:\s*(?:foreignKey|index|uniqueIndex|primaryKey|check|primaryKey)\s*\(/g;
      let pm;
      while ((pm = propRe.exec(cbBody))) existingProps.add(pm[1]);

      const injectedNames = new Set();
      const fkLines = [];
      for (const r of list) {
        let name = `fk_${r.refVar}_${r.colProp}`;
        let i = 2;
        while (existingProps.has(name) || injectedNames.has(name)) name = `fk_${r.refVar}_${r.colProp}_v${i++}`;
        existingProps.add(name);
        injectedNames.add(name);
        fkLines.push(genFk(r, cbParam, name));
      }
      const fkBlock = fkLines.join('\n');

      if (cbMatch) {
        const insert = fkBlock + '\n  ';
        content = content.slice(0, cbClose) + insert + content.slice(cbClose);
      } else {
        const insert = ',\n  (table) => ({\n' + fkBlock + '\n  })';
        content = content.slice(0, colsClose + 1) + insert + content.slice(colsClose + 1);
      }
      applied += list.length;
    }

    content = ensureImport(content, file, recs);
    if (process.env.DRY_RUN) {
      console.log('  [DRY] WOULD WRITE', path.relative(process.cwd(), file), '(+' + recs.length + ' FK)');
    } else {
      fs.writeFileSync(file, content);
      console.log('  WROTE', path.relative(process.cwd(), file), '(+' + recs.length + ' FK)');
    }
  }

  // 写出缺口清单供检查
  fs.writeFileSync(path.resolve(__dirname, 'fk-gap-applied.json'),
    JSON.stringify({
      applied: gap.map(f => ({ table: f.table_name, column: f.column_name, ref: f.ref_table, refColumn: f.ref_column, name: f.constraint_name })),
      skippedSelfRefOrCycle: skipLog.map(s => ({ table: s.fk.table_name, column: s.fk.column_name, ref: s.fk.ref_table, name: s.fk.constraint_name, reason: s.reason })),
    }, null, 2));
  console.log('DONE. Applied FK count:', applied, '| Skipped(self-ref/cycle):', skipLog.length);
})().catch(e => { console.error('FATAL', e); process.exit(1); });

function genFk(r, param, propName) {
  return `    ${propName}: foreignKey({\n` +
    `      name: '${r.constraintName}',\n` +
    `      columns: [${param}.${r.colProp}],\n` +
    `      foreignColumns: [${r.refVar}.${r.refColProp}],\n` +
    `    })\n` +
    `      .onDelete('${r.onDelete}')\n` +
    `      .onUpdate('${r.onUpdate}'),`;
}

function ensureImport(content, file, recs) {
  const bindings = new Set();
  const impRe = /(?:import|export)\s*(?:type\s*)?\{([^}]*)\}/g;
  let im;
  while ((im = impRe.exec(content))) {
    im[1].split(',').forEach((part) => {
      const m = part.trim().match(/(\w+)(?:\s+as\s+(\w+))?/);
      if (m) bindings.add(m[2] || m[1]);
    });
  }
  if (!bindings.has('foreignKey')) {
    content = `import { foreignKey } from 'drizzle-orm/mysql-core';\n` + content;
    bindings.add('foreignKey');
  }
  const need = new Set();
  const needList = [];
  for (const r of recs) {
    const defFile = findVarFile(r.refVar);
    if (!defFile) continue;
    if (defFile === file) continue;
    if (bindings.has(r.refVar)) continue;
    const k = r.refVar + '|' + defFile;
    if (need.has(k)) continue;
    need.add(k);
    needList.push({ var: r.refVar, from: defFile });
  }
  for (const imp of needList) {
    const rel = './' + path.relative(path.dirname(file), imp.from).replace(/\\/g, '/').replace(/\.ts$/, '');
    content = `import { ${imp.var} } from '${rel}';\n` + content;
  }
  return content;
}
function findVarFile(varName) {
  for (const [, info] of Object.entries(tableToVar)) if (info.var === varName) return info.file;
  return null;
}
