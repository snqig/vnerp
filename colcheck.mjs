import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
const env = readFileSync('.env','utf8');
const get = (k)=>{ const m = env.match(new RegExp('^'+k+'=(.*)$','m')); return m?m[1].trim():undefined; };
const cfg = { host:get('DB_HOST')||'127.0.0.1', port:parseInt(get('DB_PORT')||'3306'), user:get('DB_USER')||'root', password:get('DB_PASSWORD')||'', database:get('DB_NAME')||'vnerpdacahng' };
const conn = await mysql.createConnection(cfg);
const tables = ['sal_delivery','sal_return','sal_reconciliation','pur_purchase_return','pur_purchase_return_line','pur_request','pur_request_item','pur_supplier'];
for (const t of tables) {
  try {
    const [rows] = await conn.query("SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema=? AND table_name=? ORDER BY ORDINAL_POSITION",[cfg.database,t]);
    const cols = rows.map(r=>r.COLUMN_NAME);
    console.log(`\n=== ${t} (${cols.length} cols) ===`);
    console.log(cols.join(', '));
  } catch(e){ console.log(`\n=== ${t} ERROR: ${e.message}`); }
}
await conn.end();
