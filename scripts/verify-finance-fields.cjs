// Runtime verification of finance field-mapping fixes (F1-F4)
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
function show(label, v) { return `${label}=` + JSON.stringify(v); }

(async () => {
  const token = await login();
  console.log('LOGIN OK');

  // F2: /api/finance/payable should include supplier_name
  {
    const j = await jget(token, '/api/finance/payable?pageSize=3');
    const list = j?.data?.list || [];
    const f = list[0] || {};
    console.log('[payable(singular)] count=', list.length, '| sample keys:', Object.keys(f).filter(k=>/supplier|name/.test(k)));
    console.log('   ', show('supplier_name', f.supplier_name), '| supplier_id=', f.supplier_id);
  }

  // payables(plural) supplier_name + source_currency
  {
    const j = await jget(token, '/api/finance/payables?pageSize=3');
    const list = j?.data?.list || [];
    const f = list[0] || {};
    console.log('[payables(plural)] count=', list.length, '|', show('supplier_name', f.supplier_name), '|', show('source_currency', f.source_currency));
  }

  // F4/F5: receivables list source_currency + source_amount
  {
    const j = await jget(token, '/api/finance/receivables?pageSize=3');
    const list = j?.data?.list || [];
    const f = list[0] || {};
    console.log('[receivables list] count=', list.length, '|', show('customer_name', f.customer_name), '|', show('source_currency', f.source_currency), '|', show('source_amount', f.source_amount));
    // F1: detail via ?id= should return single row, not list envelope
    if (list.length > 0) {
      const id = f.id;
      const d = await jget(token, `/api/finance/receivables?id=${id}`);
      const row = d?.data;
      const isSingle = row && !Array.isArray(row) && !('list' in row);
      console.log('[receivables ?id=] id=', id, '| isSingleRow=', isSingle, '| receivable_no=', row?.receivable_no, '| customer_name=', row?.customer_name, '| receipts=', Array.isArray(row?.receipts) ? row.receipts.length : 'n/a');
    }
  }

  // F3: /api/finance/cost returns cost_summary
  {
    const j = await jget(token, '/api/finance/cost?pageSize=3');
    console.log('[cost] cost_summary=', JSON.stringify(j?.data?.cost_summary), '| list count=', (j?.data?.list||[]).length);
  }
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
