const cp = require('child_process');
const out = cp.execSync('node scripts/_audit/scan7.cjs', { cwd: process.cwd(), encoding: 'utf8' });
const arr = JSON.parse(out.slice(out.indexOf('[')));
const strip = (s) => s.replace('src\\app\\[locale]\\', '');
console.log('TOTAL CANDIDATES:', arr.length);
const nobe = arr.filter(x => x.note === 'NO_BE_PARSED');
console.log('NO_BE_PARSED (endpoint not in live map):', nobe.length);
nobe.forEach(x => console.log('  ', strip(x.page), '->', x.ep));
console.log('--- REAL CANDIDATES ---');
arr.filter(x => !x.note).forEach(x => {
  console.log('\nPAGE: ' + strip(x.page));
  console.log('  EP: ' + x.ep + ' | style: ' + x.style + ' | beCount: ' + x.beCount);
  if (x.trulyMissing && x.trulyMissing.length) console.log('  TRULY MISSING: ' + x.trulyMissing.join(', '));
  if (x.styleMismatch && x.styleMismatch.length) console.log('  STYLE MISMATCH (camel vs snake): ' + x.styleMismatch.join(', '));
});
