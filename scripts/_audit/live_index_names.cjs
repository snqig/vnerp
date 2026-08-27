const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const envPath = path.resolve(__dirname, '..', '..', '.env');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
(async () => {
  const conn = await mysql.createConnection({ host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME });
  const [rows] = await conn.execute(
    `SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND TABLE_NAME='inv_inventory_batch' ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
    [env.DB_NAME]
  );
  console.log('=== inv_inventory_batch indexes (live) ===');
  for (const r of rows) console.log(`  ${r.INDEX_NAME}\tcol=${r.COLUMN_NAME}\tunique=${r.NON_UNIQUE===0}`);
  await conn.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
