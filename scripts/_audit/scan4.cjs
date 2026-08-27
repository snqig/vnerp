// scan4.cjs v2 — page -> own-route-endpoint field diff vs backend.
const fs = require('fs');
const path = require('path');

const APP = path.resolve('src/app/[locale]');
const beRaw = JSON.parse(fs.readFileSync('scripts/_audit/be_fields.json', 'utf8'));
const beMap = {};
for (const r of beRaw) beMap[r.ep] = { set: new Set(r.fields), style: r.style };

const DENY = new Set(['map','filter','find','forEach','slice','length','toString','toFixed','includes','split','join','push','pop','sort','reduce','some','every','concat','trim','replace','match','substring','substr','charAt','toLowerCase','toUpperCase','then','catch','finally','keys','values','hasOwnProperty','valueOf','constructor','prototype','id','key',
  // response envelope keys (not row fields)
  'list','total','items','records','pagination','page','pageSize','success','code','message','data','result']);
const ROW_VARS = ['record','row','item','col','node','r','d','x','it','entity','info','detail','current','opt','option','tag','v','val','cell','order','customer','product','material','batch'];

// Collect .tsx files for a page, but DO NOT recurse into subdirectories that
// have their own page.tsx (those are separate pages and pollute attribution).
function walkTsx(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (fs.existsSync(path.join(p, 'page.tsx'))) continue; // separate page -> skip
      walkTsx(p, out);
    } else if (e.name.endsWith('.tsx')) out.push(p);
  }
  return out;
}
function readSafe(f) { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } }
function endpointsIn(text) {
  // match both '...' and `...` template literals; stop at ? or ${ or quote
  const re = /['`]\/api\/[^\s'"`,$?]+/g;
  const s = new Set(); let m;
  while ((m = re.exec(text)) !== null) s.add(m[0].slice(1).replace(/^\/api/, ''));
  return s;
}
function feFieldsIn(text) {
  const re = new RegExp('\\b(' + ROW_VARS.join('|') + ')\\.([a-zA-Z_$][\\w$]*)', 'g');
  const s = new Set(); let m;
  while ((m = re.exec(text)) !== null) {
    const field = m[2];
    if (DENY.has(field)) continue;
    if (/^(to|is|has|get|set|on|handle|render|use)[A-Z]/.test(field)) continue;
    s.add(field);
  }
  return s;
}

const candidates = [];
let pagesWithEp = 0, compared = 0, skipped = [], skippedNoRef = [];
for (const e of fs.readdirSync(APP, { withFileTypes: true })) {
  if (!e.isDirectory()) continue;
  const dir = path.join(APP, e.name);
  const pageFile = path.join(dir, 'page.tsx');
  if (!fs.existsSync(pageFile)) continue;
  const routePath = path.relative(APP, dir).replace(/\\/g, '/');
  // skip dynamic/detail pages ([id], [material_id], ...)
  if (routePath.includes('[')) continue;

  const tsx = walkTsx(dir);
  const allText = tsx.map(readSafe).join('\n');
  const eps = endpointsIn(allText);
  const fe = feFieldsIn(allText);
  if (fe.size === 0) continue;
  let pageCompared = 0;
  for (const ep of eps) {
    if (ep.includes('[')) continue; // detail endpoint
    const be = beMap[ep];
    if (!be || be.set.size === 0) continue;
    pageCompared++;
    const missing = [...fe].filter(f => !be.set.has(f));
    if (missing.length > 0) {
      candidates.push({
        page: routePath,
        ep,
        missing: missing.sort(),
        missingCount: missing.length,
        feCount: fe.size,
        beCount: be.set.size,
        underDetected: be.set.size <= 6,
      });
    }
  }
  if (pageCompared > 0) compared++;
  else if (eps.size === 0) skippedNoRef.push(routePath);
}

candidates.sort((a,b) => (b.underDetected?1:0)-(a.underDetected?1:0) || b.missingCount - a.missingCount);
console.log('Pages compared (referenced >=1 list endpoint):', compared);
if (skippedNoRef.length) console.log('Pages referencing NO /api endpoint (dashboards/forms):', skippedNoRef.length);
const real = candidates.filter(c => !c.underDetected);
const suspect = candidates.filter(c => c.underDetected);
console.log('Candidate (page,endpoint) pairs with FE fields missing from BE:', candidates.length);
console.log('  Likely real (BE well-detected):', real.length, '| Suspect (BE under-detected):', suspect.length);

console.log('\n=== LIKELY REAL (BE well-detected) ===');
for (const c of real.slice(0, 60)) {
  console.log(`\n${c.ep}  (FE:${c.feCount} BE:${c.beCount})`);
  console.log('  missing-in-BE:', c.missing.join(', '));
}
console.log('\n=== SUSPECT (backend under-detected, manual check) ===');
for (const c of suspect.slice(0, 40)) {
  console.log(`${c.ep} (BE:${c.beCount}) missing:${c.missing.slice(0,15).join(',')}`);
}

fs.writeFileSync('scripts/_audit/fe_be_candidates.json', JSON.stringify(candidates, null, 2));
console.log('\nWrote scripts/_audit/fe_be_candidates.json');
