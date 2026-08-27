// Field-mismatch scanner: frontend list fields vs backend API returned fields.
// Heuristic but deterministic. Outputs a per-page candidate report.
const fs = require('fs');
const path = require('path');

const ROOT = 'D:/dcprint/erp-project';
const PAGES = path.join(ROOT, 'src/app/[locale]');
const API = path.join(ROOT, 'src/app/api');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name === 'page.tsx') out.push(p);
  }
  return out;
}

function toSnake(s) {
  return s.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toLowerCase();
}

// Extract endpoints from a page (static prefix before ${} or quoted string)
function extractEndpoints(src) {
  const eps = new Set();
  const re = /authFetch\(\s*(['`])\/api\/([^'`]+(?:\$\{\})?)/g;
  let m;
  while ((m = re.exec(src))) {
    const raw = m[2];
    const prefix = raw.split('?')[0].split('${')[0];
    if (prefix) eps.add('/api/' + prefix);
  }
  const re2 = /fetch\(\s*(['`])\/api\/([^'`]+(?:\$\{\})?)/g;
  while ((m = re2.exec(src))) {
    const raw = m[2];
    const prefix = raw.split('?')[0].split('${')[0];
    if (prefix) eps.add('/api/' + prefix);
  }
  return [...eps];
}

// Find the array key the frontend reads: result.data?.xxx
function extractArrayKey(src) {
  const keys = new Set();
  const re = /result\.data\?\.\s*(\w+)/g;
  let m;
  while ((m = re.exec(src))) keys.add(m[1]);
  // also data.list etc in destructuring
  const re2 = /data\?\.(\w+)/g;
  while ((m = re2.exec(src))) keys.add(m[1]);
  return [...keys];
}

// Extract row variable names from .map((x) => ...
function extractRowVars(src) {
  const vars = new Set();
  const re = /\.map\(\s*\(\s*(\w+)\s*(?::\s*\w+)?\s*\)\s*=>/g;
  let m;
  while ((m = re.exec(src))) vars.add(m[1]);
  return [...vars];
}

// Extract field accesses for given row vars
function extractFields(src, vars) {
  const fields = new Set();
  for (const v of vars) {
    if (v.length < 1) continue;
    // match v.field but not v.field() calls necessarily; include both
    const re = new RegExp('\\b' + v + '\\.([A-Za-z_][A-Za-z0-9_]*)', 'g');
    let m;
    while ((m = re.exec(src))) fields.add(m[1]);
  }
  return [...fields];
}

// Resolve route file for an endpoint (handle [id] by glob-ish search)
function resolveRoute(ep) {
  // ep like /api/warehouse/outbound
  const parts = ep.split('/').filter(Boolean); // ['api','warehouse','outbound']
  // try exact
  let candidate = path.join(API, ...parts.slice(1), 'route.ts');
  if (fs.existsSync(candidate)) return candidate;
  // try replacing any segment with [x]
  // brute-force: walk API and match path segments ignoring dynamic
  // simpler: try each intermediate as [id]
  for (let i = 1; i < parts.length; i++) {
    const tryParts = parts.slice(1).map((p, idx) => (idx === i - 1 ? '[id]' : p));
    candidate = path.join(API, ...tryParts, 'route.ts');
    if (fs.existsSync(candidate)) return candidate;
  }
  // directory exists but no route? maybe nested
  return null;
}

// Extract returned field names from a route source
function extractBackendFields(routeSrc) {
  const fields = new Set();
  let hasStar = false;
  // SELECT ... AS `alias` or AS alias
  const asRe = /AS\s+`?([A-Za-z_][A-Za-z0-9_]*)?`?/gi;
  let m;
  while ((m = asRe.exec(routeSrc))) {
    if (m[1]) fields.add(m[1]);
  }
  // detect t.* r.* etc
  if (/\b\w+\.\*/.test(routeSrc)) hasStar = true;
  // successResponse object keys at first level: successResponse({ key: ... })
  const spRe = /successResponse\(\s*\{/g;
  while ((m = spRe.exec(routeSrc))) {
    // gather keys until matching brace — approximate: next 400 chars
    const slice = routeSrc.slice(m.index, m.index + 600);
    const keyRe = /(\w+)\s*:/g;
    let km;
    while ((km = keyRe.exec(slice))) {
      // skip words that are clearly not keys
      fields.add(km[1]);
    }
  }
  return { fields: [...fields], hasStar };
}

const pages = walk(PAGES);
const report = [];
for (const page of pages) {
  const src = fs.readFileSync(page, 'utf8');
  const eps = extractEndpoints(src);
  if (eps.length === 0) continue;
  const arrKeys = extractArrayKey(src);
  const rowVars = extractRowVars(src);
  const feFields = extractFields(src, rowVars);
  if (feFields.length === 0) continue;
  const feNorm = new Set(feFields.map(toSnake));
  const pageInfo = { page: page.replace(ROOT, ''), endpoints: eps, arrKeys, rowVars, feFields };
  // backend
  const beCandidates = [];
  for (const ep of eps) {
    const route = resolveRoute(ep);
    if (!route) { beCandidates.push({ ep, route: null }); continue; }
    const rsrc = fs.readFileSync(route, 'utf8');
    const { fields, hasStar } = extractBackendFields(rsrc);
    beCandidates.push({ ep, route: route.replace(ROOT, ''), fields, hasStar });
  }
  pageInfo.backend = beCandidates;
  report.push(pageInfo);
}

// Print
let out = '';
for (const r of report) {
  out += '\n=== ' + r.page + '\n';
  out += '  endpoints: ' + r.endpoints.join(', ') + '\n';
  out += '  arrayKey(fe): ' + (r.arrKeys.join(', ') || '(none)') + '\n';
  out += '  rowVars: ' + (r.rowVars.join(', ') || '(none)') + '\n';
  out += '  feFields(' + r.feFields.length + '): ' + r.feFields.join(', ') + '\n';
  for (const b of r.backend) {
    out += '  BE[' + b.ep + '] -> ' + (b.route || 'NO ROUTE') + '\n';
    if (b.route) out += '     beFields: ' + (b.fields.join(', ') || '(none)') + (b.hasStar ? '  [has t.*]' : '') + '\n';
  }
}
fs.writeFileSync(path.join(ROOT, 'scripts/_audit/scan_raw.txt'), out);
console.log('Scanned', pages.length, 'pages;', report.length, 'with endpoints+fields. Wrote scripts/_audit/scan_raw.txt');
