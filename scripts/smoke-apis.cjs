// Smoke test: login once, then GET every API GET endpoint, collect status.
// Detects 500s (the dominant failure mode = raw SQL referencing missing live columns).
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:5000';

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name === 'route.ts') out.push(p);
  }
}

function hasGET(file) {
  const src = fs.readFileSync(file, 'utf8');
  return /export\s+(async\s+)?function\s+GET\b|export\s+const\s+GET\b|GET\s*[:(]/.test(src);
}

async function login() {
  const r = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const cookies = r.headers.get('set-cookie') || '';
  const cookieStr = cookies.split(',').map(c => c.split(';')[0]).join('; ');
  const csrf = (cookies.match(/csrf_token=([^;]+)/) || [])[1] || '';
  const data = await r.json().catch(() => ({}));
  const token = (data.data && data.data.token) || (data.token) || '';
  return { token, cookieStr, csrf };
}

(async () => {
  const apiDir = path.join(process.cwd(), 'src/app/api');
  const routes = [];
  walk(apiDir, routes);
  const endpoints = [];
  for (const f of routes) {
    if (!hasGET(f)) continue;
    let rel = f.replace(apiDir, '').replace(/\\/g, '/').replace(/\/route\.ts$/, '');
    rel = '/api' + rel; // API routes live under /api
    rel = rel.replace(/\[([^\]]+)\]/g, '1'); // sentinel id
    endpoints.push(rel);
  }
  console.log('GET endpoints found:', endpoints.length);

  const { token, cookieStr, csrf } = await login();
  if (!token) { console.error('LOGIN FAILED'); process.exit(2); }
  console.log('token len', token.length, 'csrf', csrf ? 'yes' : 'no');

  const headers = {
    'Authorization': 'Bearer ' + token,
    'x-csrf-token': csrf,
    'Cookie': cookieStr,
  };

  const results = [];
  let fail = 0, ok = 0, other = 0;
  let idx = 0;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  for (const ep of endpoints) {
    const url = BASE + ep + (ep.includes('?') ? '&' : '?') + 'page=1&pageSize=20';
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    try {
      const r = await fetch(url, { headers, method: 'GET', signal: ctrl.signal });
      const txt = await r.text();
      let snippet = '';
      try { const j = JSON.parse(txt); snippet = JSON.stringify(j).slice(0, 200); } catch { snippet = txt.slice(0, 200); }
      const rec = { ep, status: r.status, snippet };
      results.push(rec);
      if (r.status === 500) { fail++; console.log('500', ep, '::', snippet); }
      else if (r.status === 200) ok++;
      else other++;
    } catch (e) {
      results.push({ ep, status: 'ERR', snippet: e.message });
      fail++; console.log('ERR', ep, e.message);
    } finally {
      clearTimeout(timer);
    }
    idx++;
    if (idx % 40 === 0) console.log(`progress ${idx}/${endpoints.length} ok=${ok} other=${other} fail=${fail}`);
    await sleep(120);
  }
  try { fs.writeFileSync('_smoke_results.json', JSON.stringify(results, null, 2)); console.log('Wrote _smoke_results.json'); }
  catch (e) { console.log('write err', e.message); }
  console.log(`\nSUMMARY: ok(200)=${ok} other=${other} fail(500/ERR)=${fail}`);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
