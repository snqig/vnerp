// fetch_check.cjs — fetch live API endpoint and print real returned record keys
const fs = require('fs');
const crypto = require('crypto');
const a = require('../../auth.json');
// Stored cookie may be expired; forge a fresh dev token with the project's dev JWT secret.
const SECRET = fs.readFileSync('D:/dcprint/erp-project/.env', 'utf8').match(/JWT_SECRET=(.*)/)[1].trim();
function b64u(obj) { return Buffer.from(JSON.stringify(obj)).toString('base64url'); }
function sign(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const h = b64u(header);
  const p = b64u(payload);
  const sig = crypto.createHmac('sha256', SECRET).update(h + '.' + p).digest('base64url');
  return h + '.' + p + '.' + sig;
}
const now = Math.floor(Date.now() / 1000);
const payload = { userId: 1, username: 'admin', realName: '超级管理员', roles: ['super_admin'], iat: now, exp: now + 86400 * 30 };
const access_token = sign(payload);
const cookie = 'access_token=' + access_token;

async function fetchEp(ep) {
  const url = 'http://127.0.0.1:5000/api/' + ep.replace(/^\/api\//, '');
  const res = await fetch(url + '?pageSize=5', { headers: { Cookie: cookie } });
  const txt = await res.text();
  let json;
  try { json = JSON.parse(txt); } catch { return { ep, status: res.status, raw: txt.slice(0, 300) }; }
  let list = null;
  const d = json.data;
  if (d && Array.isArray(d.list)) list = d.list;
  else if (d && Array.isArray(d.records)) list = d.records;
  else if (d && Array.isArray(d.items)) list = d.items;
  else if (Array.isArray(d)) list = d;
  else if (Array.isArray(json)) list = json;
  if (!list || !list.length) return { ep, status: res.status, success: json.success, total: d && d.total, note: 'empty/no-list', keys: d ? Object.keys(d) : Object.keys(json) };
  const keys = Object.keys(list[0]);
  return { ep, status: res.status, count: list.length, recordKeys: keys, sample: list[0] };
}

(async () => {
  const eps = process.argv.slice(2);
  for (const ep of eps) {
    try { console.log('\n===== ' + ep + ' ====='); console.log(JSON.stringify(await fetchEp(ep), null, 2)); }
    catch (e) { console.log(ep, 'ERR', e.message); }
  }
})();
