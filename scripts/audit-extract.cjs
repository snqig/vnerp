#!/usr/bin/env node
/**
 * 三层字段一致性审计-候选提取器（只读）。
 * 对每个业务模块输出：
 *  - 后端 route.ts 涉及的表与 INSERT/UPDATE 列、req.json 解构字段、validateRequestBody 字段
 *  - 前端 page.tsx 的表单字段(form.x)、表格列(accessorKey)、fetch body 字段
 *  - DB 中该表 NOT NULL 且不在后端写入/前端表单里的列（疑似缺录入控件）
 *  - 前端 form 字段不在该表列里的（疑似幽灵字段 / 命名不一致）
 * 仅做启发式提取，最终结论需人工/主代理复核源码。
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const MODULES = [
  'engineering',
  'sample/management', 'sample/orders', 'sample/standard-card',
  'engineering/sample-to-mass', 'engineering/sop', 'prepress/die-template',
  'dcprint/ink', 'dcprint/process-cards', 'dcprint/labels',
  'dcprint/ink-opening', 'dcprint/ink-mixed', 'dcprint/trace',
  'plm/lifecycle', 'plm/eco',
  'production', 'production/workorder', 'production/schedule',
  'production/process', 'production/report', 'production/orders',
  'production/material-issue', 'production/material-return', 'production/product-label',
  'warehouse/inbound', 'warehouse/outbound',
];

function read(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }

// 加载 DB 列
const colLines = read(path.join(ROOT, 'database/_live_columns.txt')).split('\n').filter(Boolean);
const dbCols = {}; // table -> [{c,type,null,tbl}]
for (const l of colLines) {
  const [tbl, col, type, isnull] = l.split('|');
  (dbCols[tbl] ||= []).push({ c: col, t: type, n: isnull });
}

// 加载 FK
const fkLines = read(path.join(ROOT, 'database/_live_fks.txt')).split('\n').filter(Boolean);

function findApiRoutes(mod) {
  const base = path.join(ROOT, 'src/app/api', mod);
  const out = [];
  (function walk(d) {
    let st; try { st = fs.statSync(d); } catch { return; }
    if (st.isDirectory()) {
      for (const e of fs.readdirSync(d)) {
        const fp = path.join(d, e);
        if (fs.statSync(fp).isDirectory()) walk(fp);
        else if (e === 'route.ts') out.push(fp);
      }
    }
  })(base);
  return out;
}

function findPages(mod) {
  const dir = path.join(ROOT, 'src/app/[locale]', mod);
  const out = [];
  (function walk(d) {
    let st; try { st = fs.statSync(d); } catch { return; }
    if (!st.isDirectory()) return;
    for (const e of fs.readdirSync(d)) {
      const fp = path.join(d, e);
      if (fs.statSync(fp).isDirectory()) walk(fp);
      else if (e.endsWith('.tsx') || e.endsWith('.ts')) out.push(fp);
    }
  })(dir);
  return out;
}

function extractTablesFromSql(sql) {
  const tables = new Set();
  let m;
  const re1 = /(?:INSERT\s+INTO|UPDATE|FROM|JOIN)\s+`?(\w+)`?/gi;
  while ((m = re1.exec(sql))) tables.add(m[1]);
  // 仅保留形如业务表的（过滤 select 1 等）
  return [...tables].filter((t) => /^[a-z]/.test(t) && !/^(select|dual|information_schema)$/.test(t));
}

function extractInsertCols(sql) {
  const map = {};
  let m;
  const re = /INSERT\s+INTO\s+`?(\w+)`?\s*\(([^)]*)\)/gi;
  while ((m = re.exec(sql))) {
    const cols = m[2].split(',').map((s) => s.trim().replace(/`/g, '')).filter(Boolean);
    map[m[1]] = (map[m[1]] || []).concat(cols);
  }
  return map;
}
function extractUpdateCols(sql) {
  const map = {};
  let m;
  const re = /UPDATE\s+`?(\w+)`?\s+SET\s+([\s\S]*?)(?:WHERE|;|$)/gi;
  while ((m = re.exec(sql))) {
    const body = m[2];
    const cols = [...body.matchAll(/(?:^|[^=])`?(\w+)`?\s*=/g)].map((x) => x[1]).filter((c) => c && c.toUpperCase() !== 'SET');
    map[m[1]] = (map[m[1]] || []).concat(cols);
  }
  return map;
}
function extractJsonFields(code) {
  const out = new Set();
  let m;
  const re = /(?:const|let|var)\s*\{([^}]*)\}\s*=\s*(?:await\s+)?\w+\.json\(\)/g;
  while ((m = re.exec(code))) {
    for (const part of m[1].split(',')) {
      const name = part.split(':')[0].trim().replace(/\.\.\./, '');
      if (name) out.add(name);
    }
  }
  // body.xxx
  const re2 = /\bbody\.([A-Za-z_]\w*)/g;
  while ((m = re2.exec(code))) out.add(m[1]);
  return [...out];
}
function extractValidateFields(code) {
  const out = [];
  const re = /validateRequestBody\s*\(\s*\w+\s*,\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(code))) {
    out.push(...m[1].split(',').map((s) => s.trim().replace(/['"`]/g, '')).filter(Boolean));
  }
  return out;
}
function extractFormFields(code) {
  const out = new Set();
  let m;
  const re = /(?:value|defaultValue)=\{\s*form\.([A-Za-z_]\w*)/g;
  while ((m = re.exec(code))) out.add(m[1]);
  const re2 = /name=["']([A-Za-z_]\w*)["']/g;
  while ((m = re2.exec(code))) out.add(m[2]);
  // setForm({ ...form, X: ... }) 模式
  const re3 = /\bsetForm\(\{\s*\.\.\.\s*form\s*,\s*([A-Za-z_]\w*)\s*:/g;
  while ((m = re3.exec(code))) out.add(m[1]);
  return [...out];
}
function extractAccessorKeys(code) {
  const out = new Set();
  let m;
  const re = /accessorKey:\s*["']([^"']+)["']/g;
  while ((m = re.exec(code))) out.add(m[1]);
  // column 定义里的 key:
  const re2 = /\bkey:\s*["']([^"']+)["']/g;
  while ((m = re2.exec(code))) out.add(m[2]);
  return [...out];
}
function extractFetchBody(code) {
  const out = new Set();
  let m;
  const re = /body:\s*JSON\.stringify\(\{([\s\S]*?)\}\s*\)/g;
  while ((m = re.exec(code))) {
    for (const mm of m[1].matchAll(/(?:^|,)\s*([A-Za-z_]\w*)\s*:/g)) out.add(mm[1]);
  }
  return [...out];
}

const res = [];
for (const mod of MODULES) {
  const routes = findApiRoutes(mod);
  const pages = findPages(mod);
  let allSql = routes.map((f) => read(f)).join('\n');
  // 若后端目录不存在，从 page 找 /api 调用
  let apiRefs = [];
  if (!routes.length) {
    const pc = pages.map((f) => read(f)).join('\n');
    apiRefs = [...pc.matchAll(/\/api\/[A-Za-z0-9_/-]+/g)].map((x) => x[0]);
  }
  const ins = extractInsertCols(allSql);
  const upd = extractUpdateCols(allSql);
  const jsonF = [...new Set(routes.map((f) => extractJsonFields(read(f))).flat())];
  const valF = [...new Set(routes.map((f) => extractValidateFields(read(f))).flat())];
  const tables = [...new Set([...Object.keys(ins), ...Object.keys(upd), ...extractTablesFromSql(allSql)])];

  const pageCode = pages.map((f) => read(f)).join('\n');
  const formF = extractFormFields(pageCode);
  const accK = extractAccessorKeys(pageCode);
  const fetchB = extractFetchBody(pageCode);

  const block = [`\n===== MODULE: /${mod} =====`,
    `routes(${routes.length}): ${routes.map((f)=>f.replace(ROOT,'')).join(', ')||'(none)'}`,
    `pages(${pages.length}): ${pages.map((f)=>f.replace(ROOT,'')).join(', ')||'(none)'}`,
    apiRefs.length ? `apiRefsFromPage: ${[...new Set(apiRefs)].join(', ')}` : null,
    `tables: ${tables.join(', ')}`,
    `INSERT cols: ${JSON.stringify(ins)}`,
    `UPDATE cols: ${JSON.stringify(upd)}`,
    `json destructure: ${jsonF.join(', ')}`,
    `validateRequestBody fields: ${valF.join(', ')}`,
    `frontend form fields: ${formF.join(', ')}`,
    `frontend table accessorKey: ${accK.join(', ')}`,
    `frontend fetch body keys: ${fetchB.join(', ')}`,
  ].filter(Boolean).join('\n');
  res.push(block);

  // 对每个表做 NOT NULL 缺控件分析
  for (const t of tables) {
    const cols = dbCols[t];
    if (!cols) continue;
    const writeCols = new Set([...(ins[t] || []), ...(upd[t] || [])]);
    const frontCols = new Set([...formF, ...fetchB]);
    const nnMissing = cols.filter((c) => c.n === 'NO' && !['id','create_time','update_time','deleted','create_by','update_by','deleted_at','deleted_by'].includes(c.c) && !writeCols.has(c.c) && !frontCols.has(c.c) && !jsonF.includes(c.c) && !valF.includes(c.c));
    const phantom = [...frontCols].filter((f) => f && !cols.some((c) => c.c === f) && !['id','page','pageSize','keyword','id','status'].includes(f));
    if (nnMissing.length || phantom.length) {
      res.push(`  [${t}] NOT NULL 疑似缺控件: ${nnMissing.map((c)=>c.c).join(', ') || '(无)'}`);
      res.push(`  [${t}] 前端字段疑似不在该表列: ${phantom.join(', ') || '(无)'}`);
    }
  }
}
fs.writeFileSync(path.join(ROOT, 'database/_audit_candidates.txt'), res.join('\n'), 'utf8');
console.log('modules:', MODULES.length, 'output bytes:', res.join('\n').length);
