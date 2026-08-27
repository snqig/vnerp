// scan10.cjs — Smart verifier: models `||` fallback normalization in pages.
const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const beRaw = require('./be_fields_live.json');
const beMap = {};
for (const e of beRaw) {
  const ep = (e.ep || '').replace(/^\/api/, '');
  beMap[ep] = new Set((e.fields || []).map(f => f.trim()).filter(Boolean));
}

// Reproduce scan7 candidate generation (page -> endpoints -> fe fields)
function walk(dir, out = []) {
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

// Extract normalization:  key: item.A || item.B || 'literal'  (within .map blocks or anywhere)
function extractNormalization(src) {
  // collect pairs key -> set of item.X variants + hasLiteral fallback
  const norm = {}; // key -> {variants:Set, literal:bool}
  const re = /([A-Za-z_$][\w$]*)\s*:\s*item\.([A-Za-z_]\w*)(?:\s*\|\|\s*(?:item\.([A-Za-z_]\w*)|['"][^'"]*['"]))*/g;
  let m;
  while ((m = re.exec(src))) {
    const key = m[1];
    if (['return','if','function','const','let','await'].includes(key)) continue;
    if (!norm[key]) norm[key] = { variants: new Set(), literal: false };
    norm[key].variants.add(m[2]);
    if (m[3]) norm[key].variants.add(m[3]);
    if (m[0].includes("|| '") || m[0].includes('|| "') || /(?:\|\|\s*)(['"])/.test(m[0])) norm[key].literal = true;
  }
  // also direct record.X / row.X accesses (no normalization) -> single variant, no literal
  const dr = /\b(?:record|row|item|r|d|it|node|val)\.([A-Za-z_]\w*)/g;
  while ((m = dr.exec(src))) {
    if (!norm[m[1]]) norm[m[1]] = { variants: new Set([m[1]]), literal: false };
  }
  return norm;
}

const results = [];
for (const mod of MODULES) {
  for (const page of walk(path.join(LOCALE, mod))) {
    const src = fs.readFileSync(page, 'utf8');
    const eps = new Set();
    let m;
    while ((m = epRe.exec(src))) {
      let ep = m[1].replace(/\?.*$/, '').replace(/\$\{[^}]*\}.*$/, '').replace(/^\/api/, '');
      eps.add(ep);
    }
    const norm = extractNormalization(src);
    for (const ep of eps) {
      const be = beMap[ep];
      if (!be) continue;
      // For each normalized key, check satisfaction
      const unsatisfied = [];
      for (const [key, info] of Object.entries(norm)) {
        if (['success','data','message','code','list','records','items','total','pagination','page','pageSize'].includes(key)) continue;
        if (info.literal) continue; // has literal fallback -> safe
        const anyVariant = [...info.variants].some(v => be.has(v));
        if (!anyVariant) unsatisfied.push(key + '(' + [...info.variants].join('/') + ')');
      }
      // only report if unsatisfied is non-trivial AND this endpoint is plausibly the list source
      if (unsatisfied.length >= 2) {
        results.push({ page: page.replace(/.*\[locale\]\\/, ''), ep, unsatisfied: unsatisfied.slice(0, 25) });
      }
    }
  }
}
console.log('TRUE CANDIDATES (unsatisfied after || modeling):', results.length);
console.log(JSON.stringify(results, null, 2));
