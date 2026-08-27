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

const tests = [
  {
    ep: '/api/purchase/return?pageSize=3',
    label: '采购退货',
    check: (d) => {
      const a = d.list || [];
      if (!a.length) return { ok: true, note: 'empty list (no breakage)' };
      const s = a[0];
      const statusNum = typeof s.status === 'number';
      const hasTotal = 'total_amount' in s;
      const noGrand = !('grand_total' in s);
      const noReturnType = !('return_type' in s);
      return {
        ok: statusNum && hasTotal,
        note: `status=${JSON.stringify(s.status)}[num=${statusNum}] total_amount=${hasTotal} grand_total_absent=${noGrand} return_type_absent=${noReturnType}`,
      };
    },
  },
  {
    ep: '/api/sales/return?pageSize=3',
    label: '销售退货',
    check: (d) => {
      const a = d.list || [];
      if (!a.length) return { ok: true, note: 'empty list (no breakage)' };
      const s = a[0];
      const statusNum = typeof s.status === 'number';
      const reasonKey = 'reason' in s;          // table column is `reason`
      const returnReasonGone = !('return_reason' in s);
      return {
        ok: statusNum && reasonKey,
        note: `status=${JSON.stringify(s.status)}[num=${statusNum}] reason_key=${reasonKey} return_reason_absent=${returnReasonGone}`,
      };
    },
  },
  {
    ep: '/api/production/product-label?pageSize=3',
    label: '生产贴标',
    check: (d) => {
      const a = d.list || [];
      if (!a.length) return { ok: true, note: 'empty list (no breakage)' };
      const s = a[0];
      const statusNum = typeof s.status === 'number';
      const statusVals = a.map((x) => x.status);
      return {
        ok: statusNum,
        note: `status_key_present=${statusNum} sample_statuses=${JSON.stringify(statusVals)}`,
      };
    },
  },
];

(async () => {
  let allOk = true;
  for (const t of tests) {
    try {
      const res = await fetch(`http://localhost:5000${t.ep}`, {
        headers: { Cookie: `access_token=${token}` },
      });
      let body = null;
      try { body = await res.json(); } catch {}
      let info = `HTTP ${res.status}`;
      let ok = res.status === 200;
      if (res.status === 200 && body && body.data) {
        const r = t.check(body.data);
        ok = ok && r.ok;
        info += ` | ${r.note}`;
      } else if (res.status !== 200) {
        info += ` | body=${JSON.stringify(body).slice(0, 200)}`;
      }
      if (!ok) allOk = false;
      console.log(`${ok ? 'OK ' : 'FAIL'} ${t.label.padEnd(8)} -> ${info}`);
    } catch (e) {
      allOk = false;
      console.log(`FAIL ${t.label} -> EXCEPTION ${e.message}`);
    }
  }
  console.log(allOk ? '\nALL PASS' : '\nSOME FAILED');
  process.exit(allOk ? 0 : 1);
})();
