// 登录态 smoke：验证 FIFO/过期 相关端点（修复后应为 200）
const BASE = 'http://localhost:5000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const setCookie = res.headers.get('set-cookie') || '';
  const csrfMatch = setCookie.match(/csrf_token=([^;]+)/);
  const tokenMatch = setCookie.match(/token=([^;]+)/);
  const data = await res.json();
  return {
    csrf: csrfMatch ? csrfMatch[1] : '',
    token: data?.data?.token || (tokenMatch ? tokenMatch[1] : ''),
    cookie: setCookie.split(',')[0]?.split(';')[0] || '',
  };
}

async function check(auth, path) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${auth.token}`,
        'x-csrf-token': auth.csrf,
        Cookie: auth.cookie,
      },
    });
    const body = await res.text();
    let summary = '';
    try {
      const j = JSON.parse(body);
      if (j.data && typeof j.data === 'object') {
        const keys = Object.keys(j.data).slice(0, 6).join(',');
        summary = keys ? ` keys=[${keys}]` : '';
      }
    } catch {}
    return `${res.status} ${path}${summary ? ' |' + summary : ''}`;
  } catch (e) {
    return `ERR ${path} ${e.message}`;
  }
}

(async () => {
  const auth = await login();
  if (!auth.token) {
    console.log('LOGIN FAILED', auth);
    process.exit(1);
  }
  const paths = [
    '/api/warehouse/fifo-recommend?materialId=1',
    '/api/warehouse/outbound/fifo?materialId=1&requiredQty=10',
    '/api/warehouse/batch-inventory',
    '/api/warehouse/inventory/warning',
    '/api/dcprint/ink-surplus',
    '/api/inventory',
    '/api/dashboard/kpi',
  ];
  await sleep(200);
  for (const p of paths) {
    console.log(await check(auth, p));
  }
})();
