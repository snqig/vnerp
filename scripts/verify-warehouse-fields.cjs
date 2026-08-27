// Runtime verification of warehouse field-mapping fixes (tasks #36-#39)
const BASE = 'http://localhost:5000';

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const json = await res.json();
  if (!json.success || !json.data?.token) {
    throw new Error('login failed: ' + JSON.stringify(json));
  }
  return json.data.token;
}

function summarize(label, obj) {
  return `${label}: ` + JSON.stringify(obj, (k, v) => (v === null ? undefined : v));
}

async function main() {
  const token = await login();
  console.log('LOGIN OK, token length=', token.length);
  const auth = { Authorization: `Bearer ${token}` };

  // 1. inbound: base_currency
  {
    const res = await fetch(`${BASE}/api/warehouse/inbound?pageSize=2`, { headers: auth });
    const json = await res.json();
    const list = json?.data?.list || json?.data?.data || [];
    const first = list[0] || {};
    console.log('[inbound] status=', res.status, 'count=', list.length);
    console.log('   ', summarize('keys', Object.keys(first)));
    console.log('   ', summarize('base_currency', first.base_currency), '| base_total_amount=', first.base_total_amount);
  }

  // 2. outbound: baseTotalAmount / baseCurrency
  {
    const res = await fetch(`${BASE}/api/warehouse/outbound?pageSize=2`, { headers: auth });
    const json = await res.json();
    const list = json?.data?.list || json?.data?.data || [];
    const first = list[0] || {};
    console.log('[outbound] status=', res.status, 'count=', list.length);
    console.log('   ', summarize('keys', Object.keys(first)));
    console.log('   ', summarize('baseTotalAmount', first.baseTotalAmount), '| baseCurrency=', first.baseCurrency);
  }

  // 3. stocktaking: taking_type / total_items / diff_items / diff_amount
  {
    const res = await fetch(`${BASE}/api/warehouse/stocktaking?pageSize=2`, { headers: auth });
    const json = await res.json();
    const list = json?.data?.list || json?.data?.data || [];
    const first = list[0] || {};
    console.log('[stocktaking] status=', res.status, 'count=', list.length);
    console.log('   ', summarize('keys', Object.keys(first)));
    console.log('   ', summarize('taking_type', first.taking_type), '| total_items=', first.total_items, '| diff_items=', first.diff_items, '| diff_amount=', first.diff_amount);
  }

  // 4. warehouse (setup): nature / includeInCalculation / capacity / usedCapacity / manager
  {
    const res = await fetch(`${BASE}/api/warehouse?pageSize=2`, { headers: auth });
    const json = await res.json();
    const list = json?.data?.list || json?.data?.data || [];
    const first = list[0] || {};
    console.log('[warehouse] status=', res.status, 'count=', list.length);
    console.log('   ', summarize('keys', Object.keys(first)));
    console.log('   ', summarize('nature', first.nature), '| includeInCalculation=', first.includeInCalculation, '| capacity=', first.capacity, '| usedCapacity=', first.usedCapacity, '| manager=', first.manager, '| managerId=', first.managerId);
  }
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
