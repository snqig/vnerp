const fs = require('fs');
const crypto = require('crypto');

const env = fs.readFileSync('D:/dcprint/erp-project/.env', 'utf8');
const SECRET = env.split('\n').find((l) => l.startsWith('JWT_SECRET=')).split('=')[1].trim();
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sign = (p) => {
  const h = b64u({ alg: 'HS256', typ: 'JWT' });
  const pp = b64u(p);
  return `${h}.${pp}.` + crypto.createHmac('sha256', SECRET).update(`${h}.${pp}`).digest('base64url');
};
const token = sign({ sub: '1', id: 1, userId: 1, role: 'admin', username: 'admin', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 });

const endpoints = [
  '/api/orders?pageSize=3',
  '/api/sales/delivery?pageSize=3',
  '/api/warehouse/sales-outbound?pageSize=3',
  '/api/production/orders?pageSize=3',
  '/api/sample/orders?pageSize=3',
  '/api/reports/delivery-rate?pageSize=3',
  '/api/finance/cost-variance?pageSize=3',
  '/api/qrcode/trace?pageSize=3',
  '/api/sales/return?pageSize=3',
  '/api/sales/orders?pageSize=3',
];

(async () => {
  for (const ep of endpoints) {
    try {
      const res = await fetch(`http://localhost:5000${ep}`, { headers: { Cookie: `access_token=${token}` } });
      let body = null; try { body = await res.json(); } catch {}
      let info = `HTTP ${res.status}`;
      if (res.status !== 200) info += ` | ${body && body.message ? body.message.slice(0, 100) : '(no json)'}`;
      else if (body && body.data) { const d = body.data; info += Array.isArray(d.list) ? ` | list=${d.list.length}` : Array.isArray(d.records) ? ` | records=${d.records.length}` : ` | keys=${Object.keys(d).slice(0,5).join(',')}`; }
      console.log(`${res.status === 200 ? 'OK  ' : 'FAIL'} ${ep} -> ${info}`);
    } catch (e) { console.log(`ERR  ${ep} -> ${e.message}`); }
  }
})();
