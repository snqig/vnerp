const fs = require('fs');
const crypto = require('crypto');

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
  { ep: '/api/quality/incoming?pageSize=3', label: '质量来料检' },
  { ep: '/api/dcprint/trace?pageSize=3', label: '质量追溯' },
];

(async () => {
  for (const t of endpoints) {
    try {
      const res = await fetch(`http://localhost:5000${t.ep}`, {
        headers: { Cookie: `access_token=${token}` },
      });
      let body = null;
      try { body = await res.json(); } catch {}
      const keys = body?.data?.list?.[0] ? Object.keys(body.data.list[0]) : '(no rows)';
      const itemsKeys = body?.data?.list?.[0]?.items?.[0] ? Object.keys(body.data.list[0].items[0]) : '(no items)';
      console.log(`\n=== ${t.label} -> HTTP ${res.status} ===`);
      console.log('top-level list[0] keys:', JSON.stringify(keys));
      if (itemsKeys) console.log('items[0] keys:', JSON.stringify(itemsKeys));
      if (res.status === 200 && body?.data?.list?.[0]) {
        const s = body.data.list[0];
        console.log('  materialName =', JSON.stringify(s.materialName));
        console.log('  productName  =', JSON.stringify(s.productName));
        console.log('  mainMaterialName =', JSON.stringify(s.mainMaterialName));
        console.log('  mainBatchNo =', JSON.stringify(s.mainBatchNo));
        console.log('  remark      =', JSON.stringify(s.remark));
        console.log('  items[0]    =', itemsKeys === '(no items)' ? '(none)' : JSON.stringify(body.data.list[0].items[0]));
      }
    } catch (e) {
      console.log(`\n=== ${t.label} -> EXCEPTION ${e.message} ===`);
    }
  }
  process.exit(0);
})();
