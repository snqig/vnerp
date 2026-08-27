const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const envPath = path.resolve(__dirname, '..', '..', '.env');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const want = {
  inv_inventory_batch: ['material_code','area','available_area','split_flag','opened_at','qr_code','location'],
  inv_inbound_item: ['material_code'],
  inv_inventory: ['area','available_area'],
  inv_outbound_order: ['auditor_id','audit_remark','customer_id','customer_name','sales_order_no'],
};
(async () => {
  const conn = await mysql.createConnection({ host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME });
  for (const [t, cols] of Object.entries(want)) {
    const [rows] = await conn.execute(
      `SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH AS len, NUMERIC_PRECISION AS p, NUMERIC_SCALE AS s, IS_NULLABLE AS nullable, COLUMN_DEFAULT AS def, COLUMN_KEY AS k FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME IN (${cols.map(()=>'?').join(',')}) ORDER BY ORDINAL_POSITION`,
      [env.DB_NAME, t, ...cols]
    );
    console.log(`\n=== ${t} ===`);
    for (const r of rows) {
      let type = r.DATA_TYPE;
      if (r.len) type += `(${r.len})`;
      else if (r.p && r.s !== null) type += `(${r.p},${r.s})`;
      else if (r.p) type += `(${r.p})`;
      console.log(`  ${r.COLUMN_NAME}\t${type}\tnull=${r.nullable}\tdefault=${r.def}\tkey=${r.k}`);
    }
  }
  await conn.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
