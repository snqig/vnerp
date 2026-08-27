const fs = require('fs');
const crypto = require('crypto');

// --- forge admin JWT using dev JWT_SECRET ---
const env = fs.readFileSync('D:/dcprint/erp-project/.env', 'utf8');
const secretLine = env.split('\n').find((l) => l.startsWith('JWT_SECRET='));
const SECRET = secretLine.split('=')[1].trim();
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sign = (p) => {
  const h = b64u({ alg: 'HS256', typ: 'JWT' });
  const pp = b64u(p);
  return `${h}.${pp}.` + crypto.createHmac('sha256', SECRET).update(`${h}.${pp}`).digest('base64url');
};
const token = sign({ sub: '1', id: 1, userId: 1, role: 'admin', username: 'admin', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 });

const endpoints = [
  '/api/finance/receipt?pageSize=3',
  '/api/finance/payment?pageSize=3',
  '/api/finance/stats',
  '/api/finance/cost?pageSize=3',
  '/api/finance/receivables?pageSize=3',
  '/api/quality/complaint?pageSize=3',
  '/api/quality/lab-test?pageSize=3',
  '/api/quality/supplier-audit?pageSize=3',
  '/api/purchase/suppliers?pageSize=3',
  '/api/system/announcement?pageSize=3',
  '/api/system/scheduler?pageSize=3',
  '/api/trace/label?pageSize=3',
  '/api/ink-usages?pageSize=3',
];

(async () => {
  const results = [];
  for (const ep of endpoints) {
    try {
      const res = await fetch(`http://localhost:5000${ep}`, {
        headers: { Cookie: `access_token=${token}` },
      });
      let body = null;
      try { body = await res.json(); } catch {}
      let info = `HTTP ${res.status}`;
      if (res.status === 200 && body && body.data) {
        const d = body.data;
        if (Array.isArray(d.list)) info += ` | list=${d.list.length}`;
        else if (Array.isArray(d.records)) info += ` | records=${d.records.length}`;
        else if (d.receivable) info += ` | stats:recv.total=${d.receivable.total_amount}`;
        else info += ` | keys=${Object.keys(d).slice(0, 6).join(',')}`;
        // sample first record keys for finance receipt/payment/cost
        const arr = d.list || d.records || [];
        if (arr.length) {
          const sample = arr[0];
          const want = ep.includes('/finance/receipt') ? ['receipt_no', 'customer_name', 'amount'] :
                       ep.includes('/finance/payment') ? ['payment_no', 'supplier_name', 'amount'] :
                       ep.includes('/finance/cost') ? ['order_no'] : null;
          if (want) {
            const miss = want.filter((k) => !(k in sample));
            info += ` | sample_ok=${miss.length === 0 ? 'YES' : 'MISSING:' + miss.join(',')}`;
          }
        }
      } else if (res.status !== 200) {
        info += ` | msg=${body && body.message ? body.message.slice(0, 80) : '(no json)'}`;
      }
      results.push(`${res.status === 200 ? 'OK ' : 'FAIL'} ${ep} -> ${info}`);
    } catch (e) {
      results.push(`ERR ${ep} -> ${e.message}`);
    }
  }
  console.log(results.join('\n'));
})();
