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
  '/api/qrcode?pageSize=3',
  '/api/reports/dashboard',
  '/api/dcprint/tool?pageSize=3',
  '/api/system/oper-log?pageSize=3',
  '/api/hr/reports/turnover',
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
        else if (d.orderMetrics) info += ` | orders=${d.orderMetrics.totalOrders}, invAvail=${d.inventoryMetrics.totalAvailable}, finRecv=${d.financeMetrics.pendingReceivable}`;
        else if (d.totalEmployees !== undefined) info += ` | totalEmp=${d.totalEmployees}, depts=${d.byDepartment.length}`;
        else info += ` | keys=${Object.keys(d).slice(0, 6).join(',')}`;
      } else if (res.status !== 200) {
        info += ` | msg=${body && body.message ? body.message.slice(0, 120) : '(no json)'}`;
      }
      results.push(`${res.status === 200 ? 'OK ' : 'FAIL'} ${ep} -> ${info}`);
    } catch (e) {
      results.push(`ERR ${ep} -> ${e.message}`);
    }
  }
  console.log(results.join('\n'));
})();
