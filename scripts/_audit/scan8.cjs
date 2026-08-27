// scan8.cjs — Backend field extractor using authoritative _schema_dump.txt
const fs = require('fs');
const path = require('path');

const API_ROOT = path.resolve('src/app/api');
const SCHEMA_TXT = path.resolve('_schema_dump.txt');

// parse markdown schema dump: "### table (N cols)" then "  col | type | ..."
function parseSchemaTxt(file) {
  const map = {};
  if (!fs.existsSync(file)) return map;
  const txt = fs.readFileSync(file, 'utf8');
  const lines = txt.split('\n');
  let cur = null;
  for (const line of lines) {
    const h = line.match(/^###\s+([A-Za-z_]\w*)\s*\(/);
    if (h) { cur = h[1]; map[cur] = new Set(); continue; }
    if (!cur) continue;
    const m = line.match(/^\s*([A-Za-z_]\w*)\s*\|/);
    if (m) map[cur].add(m[1]);
  }
  return map;
}
const schema = parseSchemaTxt(SCHEMA_TXT);
console.error('Schema tables parsed:', Object.keys(schema).length);
for (const t of ['fin_receivable','sys_announcement','quality_final','quality_incoming']) {
  console.error('  '+t+': '+(schema[t]?schema[t].size:0)+' cols');
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name === 'route.ts') out.push(p);
  }
  return out;
}
function endpointOf(file) {
  const rel = path.relative(API_ROOT, file).replace(/\\/g, '/');
  const parts = rel.split('/').filter(p => p !== 'route.ts');
  return '/' + parts.join('/');
}
function extractFn(code, fnName) {
  let idx = code.search(new RegExp('export\\s+(?:async\\s+)?function\\s+' + fnName + '\\b'));
  if (idx < 0) {
    const m = code.match(new RegExp('export\\s+const\\s+' + fnName + '\\s*='));
    if (!m) return null;
    idx = m.index;
  }
  const arrow = code.indexOf('=>', idx);
  const scanStart = arrow > idx ? arrow : idx;
  let i = code.indexOf('{', scanStart);
  if (i < 0) return null;
  let depth = 0, start = i;
  for (; i < code.length; i++) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}') { depth--; if (depth === 0) return code.slice(start + 1, i); }
  }
  return null;
}
function mapObjectKeys(block) {
  const keys = new Set();
  const re = /([A-Za-z_$][\w$]*)\s*:/g;
  let m;
  while ((m = re.exec(block)) !== null) keys.add(m[1]);
  return keys;
}
function parseRoute(file) {
  const code = fs.readFileSync(file, 'utf8');
  const ep = endpointOf(file);
  const get = extractFn(code, 'GET');
  if (!get) return { ep, style: 'no-get', fields: new Set() };
  const fields = new Set();
  const aliasMap = {};
  const tablesInQuery = new Set();
  const fromRe = /(?:FROM|JOIN)\s+[`']?([A-Za-z_]\w*)[`']?(?:\s+([A-Za-z_]\w*))?/gi;
  let fm;
  while ((fm = fromRe.exec(code)) !== null) {
    const tbl = fm[1];
    const alias = fm[2];
    if (alias && !/^(where|and|or|on|left|right|inner|outer|join|group|order|having|limit|set|values)$/i.test(alias)) aliasMap[alias] = tbl;
    aliasMap[tbl] = tbl;
    tablesInQuery.add(tbl);
  }
  const selRe = /SELECT\s+([\s\S]*?)\s+FROM\s+/gi;
  let sm;
  while ((sm = selRe.exec(code)) !== null) {
    const items = sm[1].split(',');
    for (let it of items) {
      it = it.trim();
      if (!it) continue;
      if (it === '*') {
        for (const t of tablesInQuery) if (schema[t]) for (const c of schema[t]) fields.add(c);
        continue;
      }
      const star = it.match(/([A-Za-z_]\w*)\s*\.\s*\*/);
      if (star) {
        const tbl = aliasMap[star[1]] || star[1];
        if (schema[tbl]) for (const c of schema[tbl]) fields.add(c);
        continue;
      }
      const as = it.match(/\s+as\s+[`"]?([A-Za-z_$][\w$]*)?`?/i);
      if (as && as[1]) { fields.add(as[1]); continue; }
      const as2 = it.match(/\s+as\s+([A-Za-z_$][\w$]*)/i);
      if (as2) { fields.add(as2[1]); continue; }
      const col = it.match(/[`"]?([A-Za-z_$][\w$]*)[`"]?\s*$/);
      if (col) fields.add(col[1]);
    }
  }
  const mapRe = /\.map\(\s*\(?\s*(\w+)\s*\)?\s*=>\s*\(?\{([\s\S]*?)\}\s*\)?\s*\)/g;
  let mm;
  while ((mm = mapRe.exec(code)) !== null) {
    for (const k of mapObjectKeys(mm[2])) {
      if (['return','if','else','function','const','let','var','await','async','typeof'].includes(k)) continue;
      fields.add(k);
    }
  }
  const wrapper = new Set(['list','records','items','total','page','pageSize','pagination','data','success','code','message']);
  for (const w of wrapper) fields.delete(w);
  let style = 'aliased';
  if (fields.size === 0) style = 'unknown';
  if (fields.size > 0 && fields.size <= 4) style = 'thin';
  return { ep, style, fields };
}
const files = walk(API_ROOT);
const results = [];
for (const f of files) {
  const r = parseRoute(f);
  if (r.style !== 'no-get') results.push(r);
}
console.log('Total GET routes:', results.length);
const dump = results.map(r => ({ ep: r.ep, style: r.style, fields: [...r.fields].sort() }));
fs.writeFileSync('scripts/_audit/be_fields_v2.json', JSON.stringify(dump, null, 2));
const thin = results.filter(r => r.style === 'thin').sort((a,b)=>a.fields.size-b.fields.size);
console.log('Thin endpoints (<=4 fields):', thin.length);
for (const r of thin) console.log('  ', r.ep, '->', [...r.fields].join(','));
console.log('Wrote scripts/_audit/be_fields_v2.json');
