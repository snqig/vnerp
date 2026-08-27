// Runtime verification of HR module field-mapping fixes + probe of 6 disputed "no-route" pages
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
async function statusOf(token, url, method = 'GET') {
  const res = await fetch(BASE + url, { method, headers: authH(token) });
  return res.status;
}
const show = (label, v) => `${label}=` + JSON.stringify(v);

(async () => {
  const token = await login();
  console.log('LOGIN OK\n=== 4 field-mapping fixes ===');

  // 1) turnover (P0 white screen fix)
  {
    const j = await jget(token, '/api/hr/reports/turnover');
    const d = j?.data || {};
    const mt = d.monthlyTrend;
    const bd = (d.byDepartment || [])[0] || {};
    console.log('[turnover] totalEmployees=', d.totalEmployees, '| resignedCount=', d.resignedCount,
      '| avgTenureDays=', d.avgTenureDays, '| turnoverRate=', d.turnoverRate);
    console.log('   monthlyTrend isArray=', Array.isArray(mt), 'len=', (mt || []).length,
      '| sample=', JSON.stringify((mt || [])[0]));
    console.log('   byDepartment[0].dept_name=', bd.dept_name, '| rate=', bd.rate);
  }

  // 2) certificates expiring (snake_case fix)
  {
    const j = await jget(token, '/api/hr/certificates/expiring?days=90');
    const list = j?.data?.list || [];
    const f = list[0] || {};
    console.log('[cert-expiring] count=', list.length, '|',
      show('employee_name', f.employee_name), '|', show('cert_name', f.cert_name), '|',
      show('cert_code', f.cert_code), '|', show('expiry_date', f.expiry_date), '|',
      show('days_remaining', f.days_remaining));
  }

  // 3) login-log (os derived from user_agent)
  {
    const j = await jget(token, '/api/system/login-log?pageSize=5');
    const list = j?.data?.list || [];
    const f = list[0] || {};
    console.log('[login-log] count=', list.length, '| os=', JSON.stringify(f.os), '| browser=', JSON.stringify(f.browser));
  }

  // 4a) department (leader_name via JOIN)
  {
    const j = await jget(token, '/api/organization/department?pageSize=5');
    const list = j?.data?.list || [];
    const f = list[0] || {};
    console.log('[department] count=', list.length, '| leader_name=', JSON.stringify(f.leader_name),
      '| sort_order=', f.sort_order, '| status=', f.status);
  }

  // 4b) role (role_type / sort_order columns)
  {
    const j = await jget(token, '/api/organization/role?pageSize=5');
    const list = j?.data?.list || [];
    const f = list[0] || {};
    console.log('[role] count=', list.length, '| role_type=', f.role_type, '| sort_order=', f.sort_order,
      '| code=', f.code, '| name=', f.name);
  }

  console.log('\n=== 6 disputed "no-route" page endpoints (HTTP status) ===');
  const probes = [
    ['GET', '/api/hr/mes-sync/piece-work'],
    ['POST', '/api/hr/mes-sync/sync'],
    ['GET', '/api/hr/piece-rate?keyword='],
    ['GET', '/api/hr/piece-work?pageSize=3'],
    ['GET', '/api/hr/performance'],
    ['GET', '/api/salary/payslips/1'],
    ['GET', '/api/hr/salary/calculate?status=0&month=2026-08'],
  ];
  for (const [m, u] of probes) {
    const s = await statusOf(token, u, m);
    console.log(`  [${m}] ${u} -> ${s}`);
  }
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
