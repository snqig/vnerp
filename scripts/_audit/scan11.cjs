// scan11.cjs — Definitive runtime-backed field diff for remaining modules
const fs = require('fs');
const path = require('path');
const rt = require('./runtime_be.json');

function walk(dir, out = []) { if (!fs.existsSync(dir)) return out; for (const en of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, en.name); if (en.isDirectory()) walk(p, out); else if (en.name === 'page.tsx') out.push(p); } return out; }
const LOCALE = path.join('src/app/[locale]');
const MODULES = ['finance','quality','base-data','settings','hr','organization','dcprint','engineering','system','dashboard','reports','equipment','qrcode'];
const epRe = /authFetch\(\s*[`'"](\/api\/[^`'"]+)/g;

// page row fields with || fallback modeling
function extractNorm(src) {
  const norm = {};
  const re = /([A-Za-z_$][\w$]*)\s*:\s*item\.([A-Za-z_]\w*)(?:\s*\|\|\s*(?:item\.([A-Za-z_]\w*)|['"][^'"]*['"]))*/g;
  let m;
  while ((m = re.exec(src))) {
    const key = m[1];
    if (['return','if','function','const','let','await'].includes(key)) continue;
    if (!norm[key]) norm[key] = { variants: new Set(), literal: false };
    norm[key].variants.add(m[2]); if (m[3]) norm[key].variants.add(m[3]);
    if (m[0].includes("|| '") || m[0].includes('|| "')) norm[key].literal = true;
  }
  return norm;
}

const report = { broken: [], mismatches: [] };
for (const mod of MODULES) {
  for (const page of walk(path.join(LOCALE, mod))) {
    const src = fs.readFileSync(page, 'utf8');
    const eps = new Set();
    let mm; while ((mm = epRe.exec(src))) { let ep = mm[1].replace(/\?.*$/, '').replace(/\$\{[^}]*\}.*$/, '').replace(/^\/api/, ''); if (!ep.includes('[')) eps.add(ep); }
    const norm = extractNorm(src);
    const pageShort = page.replace(/.*\[locale\]\\/, '');
    for (const ep of eps) {
      const r = rt[ep];
      if (!r) continue;
      if (r.status !== 200) { report.broken.push({ page: pageShort, ep, status: r.status }); continue; }
      const keys = new Set(r.keys);
      const missing = [];
      for (const [key, info] of Object.entries(norm)) {
        if (['success','data','message','code','list','records','items','total','pagination','page','pageSize'].includes(key)) continue;
        if (info.literal) continue;
        const ok = [...info.variants].some(v => keys.has(v));
        if (!ok) missing.push(key + '(' + [...info.variants].join('/') + ')');
      }
      if (missing.length) report.mismatches.push({ page: pageShort, ep, status: 200, missing: missing.slice(0, 20), rtKeys: [...keys].slice(0, 12) });
    }
  }
}
console.log('BROKEN endpoints (non-200) referenced by pages:');
console.log(JSON.stringify(report.broken, null, 2));
console.log('\nFIELD MISMATCHES (page field not in 200 response):', report.mismatches.length);
console.log(JSON.stringify(report.mismatches, null, 2));
