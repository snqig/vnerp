// P2 survey: classify remaining i18n hardcodes by module + file-kind.
// Goal: find client-component UI files (can inject useTranslations('Common'))
// vs server/API/lib files (handled by P1-2 mechanism or out of P2 scope).
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const b = require(path.join(ROOT, 'eslint-baseline.json'));
const RULE = 'i18n/no-chinese-hardcode';

function readHead(fp, n = 60) {
  try {
    const full = path.join(ROOT, fp);
    const txt = fs.readFileSync(full, 'utf8');
    const lines = txt.split('\n');
    return { head: lines.slice(0, n).join('\n'), ext: path.extname(fp) };
  } catch { return { head: '', ext: path.extname(fp) }; }
}

// classify a baseline file entry
function classify(filePath) {
  const norm = filePath.replace(/\\/g, '/');
  // strip ROOT prefix -> repo-relative path
  let rel = norm;
  const rootNorm = ROOT.replace(/\\/g, '/');
  if (norm.startsWith(rootNorm + '/')) rel = norm.slice(rootNorm.length + 1);
  else if (norm.startsWith(rootNorm)) rel = norm.slice(rootNorm.length);
  const { head, ext } = readHead(rel);
  const isApi = rel.startsWith('src/app/api/');
  const isMessage = /(^|\/)(messages|locales)\//.test(rel) || rel.includes('/api-error-i18n.ts');
  const isScript = rel.startsWith('scripts/') || rel.startsWith('node_modules/');
  const isClient = /'use client'/.test(head);
  const hasUseT = /useTranslations\s*\(/.test(head) || /const\s+\w+\s*=\s*useTranslations/.test(head);
  const isTsx = ext === '.tsx';
  return { rel, isApi, isMessage, isScript, isClient, hasUseT, isTsx, ext };
}

// module = top-level feature dir under src/app or src/<dir>
function moduleOf(rel) {
  const parts = rel.split('/');
  if (parts[0] === 'src') {
    if (parts[1] === 'app') {
      // src/app/<seg>
      return 'app/' + (parts[2] || '');
    }
    return parts[1] || 'src';
  }
  return parts[0];
}

const perFile = [];
for (const f of b) {
  if (!f.filePath) continue;
  const hards = (f.messages || []).filter(m => m.ruleId === RULE);
  if (!hards.length) continue;
  const c = classify(f.filePath);
  if (c.isScript) continue;
  perFile.push({ ...c, count: hards.length });
}

// Group
const byModule = {};
for (const p of perFile) {
  const mod = moduleOf(p.rel);
  (byModule[mod] = byModule[mod] || []).push(p);
}

// Client-component candidates that LACK t (the injectable P2 target)
const clientNoT = perFile.filter(p => p.isClient && !p.hasUseT && !p.isApi && !p.isMessage);
const clientHasT = perFile.filter(p => p.isClient && p.hasUseT && !p.isApi && !p.isMessage);
const apiFiles = perFile.filter(p => p.isApi);
const serverOther = perFile.filter(p => !p.isApi && !p.isClient && !p.isMessage); // plain ts modules / server components

console.log('=== TOTALS ===');
console.log('tracked file entries with hardcodes:', perFile.length);
console.log('  client-component (has use client):', perFile.filter(p=>p.isClient).length, 'files');
console.log('  api routes:', apiFiles.length, 'files,', apiFiles.reduce((s,p)=>s+p.count,0), 'violations');
console.log('  messages/locales/i18n-map:', perFile.filter(p=>p.isMessage).length);
console.log('  other (plain ts / server comp):', serverOther.length, 'files,', serverOther.reduce((s,p)=>s+p.count,0), 'violations');

console.log('\n=== CLIENT COMPONENTS WITHOUT t (P2 injectable target) ===');
const sorted = [...clientNoT].sort((a,b)=>b.count-a.count);
console.log('count of such files:', clientNoT.length, '| total violations:', clientNoT.reduce((s,p)=>s+p.count,0));
// by module
const m2 = {};
for (const p of clientNoT) { const mod=moduleOf(p.rel); m2[mod]=(m2[mod]||0)+p.count; }
Object.entries(m2).sort((a,b)=>b[1]-a[1]).forEach(([m,v])=>console.log('  ', String(v).padStart(4), m));
console.log('\n  top 25 files by violation count:');
sorted.slice(0,25).forEach(p=>console.log('   ', String(p.count).padStart(3), p.rel));

console.log('\n=== CLIENT COMPONENTS THAT ALREADY HAVE t (P1-1 already touched / residual) ===');
console.log('count:', clientHasT.length, '| violations:', clientHasT.reduce((s,p)=>s+p.count,0));
const m3={}; for(const p of clientHasT){const mod=moduleOf(p.rel);m3[mod]=(m3[mod]||0)+p.count;}
Object.entries(m3).sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([m,v])=>console.log('  ',String(v).padStart(4),m));

console.log('\n=== PLAIN TS / SERVER (cannot use hooks) — mostly lib/domain ===');
console.log('count:', serverOther.length, '| violations:', serverOther.reduce((s,p)=>s+p.count,0));
const m4={}; for(const p of serverOther){const mod=moduleOf(p.rel);m4[mod]=(m4[mod]||0)+p.count;}
Object.entries(m4).sort((a,b)=>b[1]-a[1]).slice(0,20).forEach(([m,v])=>console.log('  ',String(v).padStart(4),m));
