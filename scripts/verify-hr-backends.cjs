// Verify the 3 newly-built HR backends (piece-rate, piece-work, payslips)
const BASE = 'http://localhost:5000';

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const json = await res.json();
  if (!json.success || !json.data?.token) throw new Error('login failed: ' + JSON.stringify(json));
  return json.data.token;
}
const authH = (t) => ({ Authorization: `Bearer ${t}` });
function jget(token, url) { return fetch(BASE + url, { headers: authH(token) }).then(r => r.json()); }
async function statusOf(token, url) { const r = await fetch(BASE + url, { headers: authH(token) }); return r.status; }

(async () => {
  const token = await login();
  console.log('LOGIN OK\n=== 3 new HR backends ===');

  // piece-rate
  {
    const j = await jget(token, '/api/hr/piece-rate');
    const list = j?.data?.list || [];
    const f = list[0] || {};
    console.log('[piece-rate] code=', j.code, '| count=', list.length);
    console.log('   sample:', JSON.stringify(f));
  }

  // piece-work
  {
    const j = await jget(token, '/api/hr/piece-work');
    const list = j?.data?.list || j?.data || [];
    const arr = Array.isArray(list) ? list : (list.list || []);
    const f = arr[0] || {};
    console.log('[piece-work] code=', j.code, '| count=', arr.length);
    console.log('   sample:', JSON.stringify(f));
  }

  // payslips (valid id 1001 from seed)
  {
    const j = await jget(token, '/api/salary/payslips/1001');
    console.log('[payslips/1001] code=', j.code, '| success=', j.success);
    console.log('   data:', JSON.stringify(j?.data));
  }

  // payslips (nonexistent id -> 404 expected)
  {
    const s = await statusOf(token, '/api/salary/payslips/999999');
    console.log('[payslips/999999] status=', s, '(expect 404)');
  }
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
