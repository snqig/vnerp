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

// 每个候选端点 + 页面实际读取的字段（已从源码提取）
const checks = [
  { ep: '/api/finance/receivables?pageSize=3', label: '§3.3.6 财务应收', reads: ['currency', 'source_currency', 'source_amount'] },
  { ep: '/api/system/user?pageSize=3', label: '§3.3.7 设置→用户', reads: ['department_id', 'id'] },
  { ep: '/api/purchase/request?pageSize=3', label: '§3.4 物料请购', reads: ['req_type', 'issue_type', 'total_quantity', 'applicant_name', 'operator_name', 'status'] },
  { ep: '/api/sales/delivery?pageSize=3', label: '§3.4 销售发货', reads: ['currency', 'base_total_amount'] },
  { ep: '/api/sales/reconciliation?pageSize=3', label: '§3.4 销售对账', reads: ['currency', 'source_currency', 'has_mismatch'] },
  { ep: '/api/outsource/order?pageSize=3', label: '§3.4 委外订单', reads: ['issued_qty', 'received_qty', 'qualified_qty'] },
  { ep: '/api/sales/orders?pageSize=3', label: '§3.4 销售订单', reads: ['currency', 'base_total_amount'] },
];

(async () => {
  for (const c of checks) {
    try {
      const res = await fetch(`http://localhost:5000${c.ep}`, {
        headers: { Cookie: `access_token=${token}` },
      });
      let body = null;
      try { body = await res.json(); } catch {}
      const list = body?.data?.list || body?.data?.records || [];
      const keys = list[0] ? Object.keys(list[0]) : '(no rows)';
      const readReport = c.reads.map((f) => `${f}=${list[0] && f in list[0] ? 'Y' : 'N'}`).join(' ');
      console.log(`\n=== ${c.label} -> HTTP ${res.status} ===`);
      console.log('  list[0] keys:', JSON.stringify(keys));
      console.log('  页面读取字段存在?', readReport);
    } catch (e) {
      console.log(`\n=== ${c.label} -> EXCEPTION ${e.message} ===`);
    }
  }
  process.exit(0);
})();
