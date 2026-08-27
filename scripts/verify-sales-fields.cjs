// Runtime verification of sales field-mapping fixes (S1-S4)
const BASE = 'http://localhost:5000';
async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'admin',password:'admin123'}) });
  const j = await res.json();
  if (!j.success || !j.data?.token) throw new Error('login failed: '+JSON.stringify(j));
  return j.data.token;
}
const jget = (t,url)=>fetch(BASE+url,{headers:{Authorization:`Bearer ${t}`}}).then(r=>r.json());
const show=(k,v)=>`${k}=`+JSON.stringify(v);

(async()=>{
  const token = await login();
  console.log('LOGIN OK');

  // S1 sales/delivery
  {
    const j = await jget(token,'/api/sales/delivery?pageSize=3');
    const f = (j?.data?.list||[])[0]||{};
    console.log('[delivery]', show('currency',f.currency), show('base_total_amount',f.base_total_amount), show('base_currency',f.base_currency));
  }
  // S2 reconciliation
  {
    const j = await jget(token,'/api/sales/reconciliation?pageSize=3');
    const f = (j?.data?.list||[])[0]||{};
    console.log('[reconciliation]', show('currency',f.currency), show('has_mismatch',f.has_mismatch), '| detail?id check:');
    if (f.id) {
      const d = await jget(token,`/api/sales/reconciliation?id=${f.id}`);
      console.log('   [detail]', show('currency',d?.data?.currency), show('has_mismatch',d?.data?.has_mismatch));
    }
  }
  // S3 sales/return
  {
    const j = await jget(token,'/api/sales/return?pageSize=3');
    const f = (j?.data?.list||[])[0]||{};
    console.log('[return]', show('return_type',f.return_type), show('total_qty',f.total_qty), show('currency',f.currency), show('base_total_amount',f.base_total_amount), show('base_currency',f.base_currency), show('inspection_status',f.inspection_status));
  }
  // S4 orders/sales
  {
    const j = await jget(token,'/api/orders/sales?pageSize=5');
    const list = j?.data?.list||[];
    const f = list[0]||{};
    const withItems = list.filter(o=>Array.isArray(o.items)&&o.items.length>0).length;
    console.log('[orders/sales] count=', list.length, '| delivery_date=', f.delivery_date, '| ordersWithItems=', withItems, '/', list.length, '| sampleItemKeys=', (f.items&&f.items[0])?Object.keys(f.items[0]).slice(0,6):'none');
  }
})().catch(e=>{console.error('ERROR:',e.message);process.exit(1);});
