// Field-mismatch scanner v2: produce a focused diff.
// Frontend row fields vs backend returned fields (SQL AS aliases + successResponse object keys).
// Flags frontend fields whose snake_case form is NOT in the backend set (and backend isn't t.*).
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
function toSnake(s) { return s.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toLowerCase(); }

function extractEndpoints(src) {
  const eps = new Set();
  const re = /authFetch\(\s*(['`])\/api\/([^'`]+(?:\$\{\})?)/g;
  let m; while ((m = re.exec(src))) { const raw = m[2]; const pre = raw.split('?')[0].split('${')[0]; if (pre) eps.add('/api/' + pre); }
  const re2 = /fetch\(\s*(['`])\/api\/([^'`]+(?:\$\{\})?)/g;
  while ((m = re2.exec(src))) { const raw = m[2]; const pre = raw.split('?')[0].split('${')[0]; if (pre) eps.add('/api/' + pre); }
  return [...eps];
}
function extractRowVars(src) {
  const vars = new Set();
  const re = /\.map\(\s*\(\s*(\w+)\s*(?::\s*\w+)?\s*\)\s*=>/g;
  let m; while ((m = re.exec(src))) vars.add(m[1]);
  return [...vars];
}
function extractFields(src, vars) {
  const fields = new Set();
  for (const v of vars) {
    if (!v) continue;
    const re = new RegExp('\\b' + v + '\\.([A-Za-z_][A-Za-z0-9_]*)', 'g');
    let m; while ((m = re.exec(src))) fields.add(m[1]);
  }
  return [...fields];
}
function resolveRoute(ep) {
  const parts = ep.split('/').filter(Boolean);
  let cand = path.join(API, ...parts.slice(1), 'route.ts');
  if (fs.existsSync(cand)) return cand;
  for (let i = 1; i < parts.length; i++) {
    const tp = parts.slice(1).map((p, idx) => (idx === i - 1 ? '[id]' : p));
    cand = path.join(API, ...tp, 'route.ts');
    if (fs.existsSync(cand)) return cand;
  }
  return null;
}
function extractBackendFields(routeSrc) {
  const fields = new Set();
  let hasStar = false;
  const asRe = /AS\s+`?([A-Za-z_][A-Za-z0-9_]*)?`?/gi;
  let m; while ((m = asRe.exec(routeSrc))) { if (m[1]) fields.add(m[1]); }
  if (/\b\w+\.\*/.test(routeSrc)) hasStar = true;
  // successResponse({ key: ... }) — capture keys within first 300 chars after each call
  const spRe = /successResponse\(\s*\{/g;
  while ((m = spRe.exec(routeSrc))) {
    const slice = routeSrc.slice(m.index, m.index + 300);
    const keyRe = /(\w+)\s*:/g; let km;
    while ((km = keyRe.exec(slice))) {
      const k = km[1];
      if (!['code', 'success', 'message', 'data'].includes(k)) fields.add(k);
    }
  }
  return { fields: [...fields], hasStar };
}

const pages = walk(PAGES);
let lines = [];
let mismatches = 0;
for (const page of pages) {
  const src = fs.readFileSync(page, 'utf8');
  const eps = extractEndpoints(src);
  if (!eps.length) continue;
  const rowVars = extractRowVars(src);
  const feFields = extractFields(src, rowVars);
  if (!feFields.length) continue;
  const feNorm = new Set(feFields.map(toSnake));

  for (const ep of eps) {
    const route = resolveRoute(ep);
    if (!route) { lines.push(`NO_ROUTE ${page.replace(ROOT,'')} -> ${ep}`); continue; }
    const rsrc = fs.readFileSync(route, 'utf8');
    const { fields, hasStar } = extractBackendFields(rsrc);
    const beNorm = new Set(fields.map(toSnake));
    if (hasStar) continue; // can't determine, skip (likely all columns)
    // candidate mismatches: fe field not in be
    const miss = [...feNorm].filter(f => !beNorm.has(f));
    if (miss.length) {
      mismatches++;
      lines.push(`MISMATCH ${page.replace(ROOT,'')}`);
      lines.push(`  EP ${ep}  ROUTE ${route.replace(ROOT,'')}`);
      lines.push(`  feFields(${feFields.length}): ${feFields.join(', ')}`);
      lines.push(`  beFields(${fields.length}): ${fields.join(', ')}`);
      lines.push(`  MISSING(snake): ${miss.join(', ')}`);
      lines.push('');
    }
  }
}
const out = `Total candidate mismatches: ${mismatches}\n\n` + lines.join('\n');
fs.writeFileSync(path.join(ROOT, 'scripts/_audit/scan_diff.txt'), out);
console.log(out);
