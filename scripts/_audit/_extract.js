const fs = require('fs');
const path = require('path');

const root = process.argv[2]; // base dir e.g. src/app/[locale]
const out = [];

function walk(dir) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name === 'page.tsx') out.push(full);
  }
}

walk(root);

function extractEndpoints(src) {
  const eps = new Set();
  const re = /['"`](\/api\/[a-zA-Z0-9_\/?=&.-]+)['"`]/g;
  let m;
  while ((m = re.exec(src))) eps.add(m[1].split('?')[0]);
  // also authFetch(`/api/...`+...) template literals
  const re2 = /authFetch\(\s*`([^`]*)`/g;
  while ((m = re2.exec(src))) {
    const mm = m[1].match(/\/api\/[a-zA-Z0-9_\/?=&.-]+/);
    if (mm) eps.add(mm[0].split('?')[0]);
  }
  return [...eps];
}

function extractRowFields(src) {
  const result = {};
  // find .map((xxx) => or .map((xxx: Type) => or .map((xxx) or .map(xxx =>
  const mapRe = /\.map\(\s*\(?\s*([A-Za-z_$][\w$]*)\s*(?::[^\n]*)?\)?\s*=>/g;
  let m;
  while ((m = mapRe.exec(src))) {
    const varName = m[1];
    if (varName.length > 12) continue; // skip long identifiers like callback names
    const re = new RegExp('\\b' + varName + '\\.([A-Za-z_$][\\w$]*)', 'g');
    let fm; const fields = new Set();
    while ((fm = re.exec(src))) fields.add(fm[1]);
    if (fields.size) result[varName] = [...fields].sort();
  }
  return result;
}

for (const f of out) {
  const src = fs.readFileSync(f, 'utf8');
  const eps = extractEndpoints(src);
  if (!eps.length) continue;
  const rowFields = extractRowFields(src);
  // also capture any data.<field> top-level
  const dataFields = new Set();
  const dRe = /\bdata\.([A-Za-z_$][\w$]*)/g; let dm;
  while ((dm = dRe.exec(src))) dataFields.add(dm[1]);
  console.log('FILE: ' + f);
  console.log('  ENDPOINTS: ' + eps.join(' | '));
  if (Object.keys(rowFields).length)
    console.log('  ROWFIELDS: ' + JSON.stringify(rowFields));
  if (dataFields.size)
    console.log('  DATAFIELDS: ' + [...dataFields].join(','));
}
