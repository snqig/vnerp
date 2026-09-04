// Focused smoke test for the dashboard endpoints fixed in the data-association audit.
// Login once, GET each endpoint, report status + a quick data-shape sanity check.
const BASE = 'http://127.0.0.1:5000';

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

function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }

(async () => {
  const { token, cookieStr, csrf } = await login();
  if (!token) { console.error('LOGIN FAILED'); process.exit(2); }
  console.log('login ok, token len', token.length);

  const headers = {
    'Authorization': 'Bearer ' + token,
    'x-csrf-token': csrf,
    'Cookie': cookieStr,
  };

  const endpoints = [
    '/api/dashboard/sales',
    '/api/dashboard/warehouse',
    '/api/dashboard/kpi',
    '/api/dashboard/production',
    '/api/dashboard/quality',
    '/api/dashboard/ceo',
  ];

  const checks = {
    '/api/dashboard/sales': (j) => {
      const top = j.data && (j.data.topProducts || j.data.topProducts);
      const arr = Array.isArray(top) ? top : (top && Array.isArray(top.list) ? top.list : null);
      return arr && arr.length > 0 ? `topProducts=${arr.length}, first="${arr[0].product_name}"` : `topProducts EMPTY(${JSON.stringify(top).slice(0,80)})`;
    },
    '/api/dashboard/warehouse': (j) => {
      const d = j.data || j;
      const inv = d.inventory || d;
      const total = inv.totalQuantity ?? inv.total ?? (Array.isArray(d.inventoryList) ? d.inventoryList.length : '?');
      return `dataKeys=${Object.keys(d).length}, total=${total}`;
    },
    '/api/dashboard/kpi': (j) => {
      const d = j.data || j;
      const ink = d.inkConsumptionRate || (d.data && d.data.inkConsumptionRate);
      const byWO = ink && (ink.byWorkOrder || []);
      return `kpiKeys=${Object.keys(d).length}, ink.byWorkOrder=${Array.isArray(byWO) ? byWO.length : 'n/a'}`;
    },
    '/api/dashboard/production': (j) => {
      const d = j.data || j;
      const p = d.personnel || d;
      return `personnel=${JSON.stringify(p)}`;
    },
    '/api/dashboard/quality': (j) => {
      const d = j.data || j;
      return `overview.passRate=${d.passRate}, defectRate=${d.defectRate}`;
    },
    '/api/dashboard/ceo': (j) => {
      const d = j.data || j;
      const inv = d.inventory || d;
      return `warehouseUtilization=${inv.warehouseUtilization}`;
    },
  };

  let allOk = true;
  for (const ep of endpoints) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    try {
      const r = await fetch(BASE + ep, { headers, method: 'GET', signal: ctrl.signal });
      const txt = await r.text();
      let info = '';
      try {
        const j = JSON.parse(txt);
        const fn = checks[ep];
        info = fn ? fn(j) : (isObj(j) ? `keys=${Object.keys(j.data || j).length}` : 'non-json');
      } catch { info = 'parse-fail: ' + txt.slice(0, 120); }
      const flag = r.status === 200 ? 'OK ' : (r.status === 500 ? '500' : r.status);
      if (r.status !== 200) allOk = false;
      console.log(`[${flag}] ${ep}  ${info}`);
    } catch (e) {
      allOk = false;
      console.log(`[ERR] ${ep}  ${e.message}`);
    } finally {
      clearTimeout(timer);
    }
  }
  console.log(allOk ? '\nALL DASHBOARD ENDPOINTS 200' : '\nSOME ENDPOINTS FAILED');
  process.exit(allOk ? 0 : 1);
})();
