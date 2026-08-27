const fs = require('fs');
const path = require('path');

const beRaw = require('./be_fields.json');
// normalize keys: strip leading /api
const beMap = {};
for (const e of beRaw) {
  const ep = (e.ep || '').replace(/^\/api/, '');
  beMap[ep] = { style: e.style, fields: new Set((e.fields || []).map(f => f.trim()).filter(Boolean)) };
}

// page -> endpoints from scan5 output (hardcode by re-scanning)
function walk(dir, out=[]) {
  if (!fs.existsSync(dir)) return out;
  for (const en of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, en.name);
    if (en.isDirectory()) walk(p, out);
    else if (en.name === 'page.tsx') out.push(p);
  }
  return out;
}
const LOCALE = path.join('src/app/[locale]');
const MODULES = ['finance','quality','base-data','settings','hr','organization','dcprint','engineering','system','dashboard','reports','equipment','qrcode'];
const epRe = /authFetch\(\s*[`'"](\/api\/[^`'"]+)/g;

function rowVarFieldAccesses(src) {
  const fields = new Set();
  // dataIndex: 'xxx' or dataIndex: "xxx"
  let m;
  const diRe = /dataIndex\s*:\s*['"]([a-zA-Z_]\w*)['"]/g;
  while ((m = diRe.exec(src))) fields.add(m[1]);
  const keyRe = /\bkey\s*:\s*['"]([a-zA-Z_]\w*)['"]/g;
  while ((m = keyRe.exec(src))) fields.add(m[1]);
  // member accesses on likely row vars: record/row/item/r/d/it/x/val/node/text/rowData
  const maRe = /\b(?:record|row|item|r\b|d\b|it|val|node|text|rowData|data)\.([a-zA-Z_]\w*)/g;
  while ((m = maRe.exec(src))) {
    if (m[1].length > 1) fields.add(m[1]);
  }
  // also form/list.map((x)=> x.field)
  const mapRe = /\.map\(\s*\(?\s*([a-zA-Z_]\w*)\s*\)?\s*=>[^)]*\.\1\.([a-zA-Z_]\w*)/g;
  while ((m = mapRe.exec(src))) fields.add(m[2]);
  return fields;
}

const report = [];
for (const mod of MODULES) {
  const dir = path.join(LOCALE, mod);
  const pages = walk(dir);
  for (const page of pages) {
    const src = fs.readFileSync(page, 'utf8');
    const eps = new Set();
    let m;
    while ((m = epRe.exec(src))) {
      let ep = m[1].replace(/\?.*$/, '').replace(/\$\{[^}]*\}.*$/, '').replace(/^\/api/, '');
      eps.add(ep);
    }
    const feFields = rowVarFieldAccesses(src);
    for (const ep of eps) {
      const be = beMap[ep];
      if (!be) { report.push({ page, ep, status: 'NO_BE_PARSED', fe: [...feFields] }); continue; }
      const missing = [...feFields].filter(f => !be.fields.has(f));
      if (missing.length) {
        report.push({ page, ep, style: be.style, missing, feCount: feFields.size, beCount: be.fields.size, beSample: [...be.fields].slice(0,15) });
      }
    }
  }
}
console.log('CANDIDATES:', report.length);
console.log(JSON.stringify(report, null, 2));
