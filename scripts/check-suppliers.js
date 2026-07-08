const mysql = require('mysql2/promise');
async function main() {
  const c = await mysql.createConnection({ host: '127.0.0.1', user: 'root', password: process.env.DB_PASSWORD || '', database: 'vnerpdacahng' });
  const [cnt] = await c.execute('SELECT COUNT(*) as cnt FROM pur_supplier WHERE deleted=0');
  console.log('Total suppliers:', cnt[0].cnt);
  const [levels] = await c.execute('SELECT credit_level, COUNT(*) as cnt FROM pur_supplier WHERE deleted=0 GROUP BY credit_level');
  console.log('By level:', JSON.stringify(levels));
  const [sample] = await c.execute('SELECT id, supplier_code, supplier_name, credit_level, status FROM pur_supplier WHERE deleted=0 LIMIT 5');
  console.log('Sample:', JSON.stringify(sample));
  await c.end();
}
main().catch(console.error);
