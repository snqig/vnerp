const fs = require('fs');
const path = require('path');

const beRaw = require('./be_fields_live.json');
const norm = (s) => s.toLowerCase().replace(/[_-]/g, '');
const beMap = {};
for (const e of beRaw) {
  const ep = (e.ep || '').replace(/^\/api/, '');
  const fs2 = (e.fields || []).map(f => f.trim()).filter(Boolean);
  beMap[ep] = {
    style: e.style,
    fields: new Set(fs2),
    fieldsNorm: new Set(fs2.map(norm)),
    // is the BE response purely snake_case (no camel anywhere)?
    hasCamel: fs2.some(f => /[A-Z]/.test(f)),
    hasSnake: fs2.some(f => /_/.test(f))
  };
}

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

const WRAP = new Set(['success','data','message','code','list','records','items','total','pagination','page','pageSize','current','pages','result','res','response','params','query','form','state','loading','error','id','status']);
const NONROW = new Set(['res','result','response','data','query','params','form','state','rowData','setData','tableData','columns','filters','sorter','pagination','option','options','config','meta','info','detail','recordData']);

function extractRowFields(src) {
  const fields = new Set();
  // dataIndex 'x'
  let m;
  const diRe = /dataIndex\s*:\s*['"]([a-zA-Z_]\w*)['"]/g;
  while ((m = diRe.exec(src))) fields.add(m[1]);
  // record.x / row.x / item.x / r.x (row vars)
  const rowRe = /\b(?:record|row|item|node|it|val)\.([a-zA-Z_]\w*)/g;
  while ((m = rowRe.exec(src))) {
    if (!WRAP.has(m[1]) && m[1].length > 1) fields.add(m[1]);
  }
  return fields;
}

const report = [];
for (const mod of MODULES) {
  const dir = path.join(LOCALE, mod);
  for (const page of walk(dir)) {
    const src = fs.readFileSync(page, 'utf8');
    const eps = new Set();
    let m;
    while ((m = epRe.exec(src))) {
      let ep = m[1].replace(/\?.*$/, '').replace(/\$\{[^}]*\}.*$/, '').replace(/^\/api/, '');
      eps.add(ep);
    }
    const feFields = extractRowFields(src);
    const feList = [...feFields];
    for (const ep of eps) {
      const be = beMap[ep];
      if (!be) { report.push({ page, ep, note: 'NO_BE_PARSED', feList }); continue; }
      const exactMissing = feList.filter(f => !be.fields.has(f));
      // normalized (strip underscore/case) check: truly absent from BE
      const trulyMissing = exactMissing.filter(f => !be.fieldsNorm.has(norm(f)));
      // style mismatch: normalized present but exact string absent AND BE is single-style
      const styleMismatch = exactMissing.filter(f => {
        if (be.fieldsNorm.has(norm(f)) && !be.fields.has(f)) {
          // BE has the field under a different style (camel vs snake)
          if ((/[A-Z]/.test(f) && be.hasSnake && !be.hasCamel) || (/_/.test(f) && be.hasCamel && !be.hasSnake)) return true;
          // mixed BE: both forms present -> fine
        }
        return false;
      });
      if (trulyMissing.length || styleMismatch.length) {
        report.push({ page, ep, style: be.style, trulyMissing, styleMismatch, exactMissingCount: exactMissing.length, beCount: be.fields.size, beSample: [...be.fields].slice(0,20) });
      }
    }
  }
}
console.log('CANDIDATES (truly missing vs BE, case-insensitive):', report.length);
console.log(JSON.stringify(report, null, 2));
