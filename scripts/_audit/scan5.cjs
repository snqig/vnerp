const fs = require('fs');
const path = require('path');

const LOCALE = path.join('src/app/[locale]');
const MODULES = ['finance','quality','base-data','settings','hr','organization','dcprint','engineering','system','dashboard','reports','equipment','qrcode'];

function walk(dir, out=[]) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name === 'page.tsx' || e.name.endsWith('.tsx')) out.push(p);
  }
  return out;
}

// endpoint regex: authFetch(`/api/...`) or authFetch('/api/...')
const re = /authFetch\(\s*[`'"](\/api\/[^`'"]+)/g;

const result = {};
for (const m of MODULES) {
  const dir = path.join(LOCALE, m);
  const files = walk(dir).filter(f => f.endsWith('page.tsx'));
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    const eps = new Set();
    let mm;
    while ((mm = re.exec(src))) {
      let ep = mm[1];
      // strip query and template vars
      ep = ep.replace(/\?.*$/, '').replace(/\$\{[^}]*\}.*$/, '');
      eps.add(ep);
    }
    if (eps.size) result[f] = [...eps];
  }
}

console.log(JSON.stringify(result, null, 2));
