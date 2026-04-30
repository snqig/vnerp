const mysql = require('mysql2/promise');
async function main() {
  const c = await mysql.createConnection({ host: '127.0.0.1', user: 'root', password: 'Snqig521223', database: 'vnerpdacahng' });
  await c.execute("UPDATE pur_supplier SET credit_level='S' WHERE id=1");
  await c.execute("UPDATE pur_supplier SET credit_level='A' WHERE id=2");
  await c.execute("UPDATE pur_supplier SET credit_level='B' WHERE id=3");
  await c.execute("UPDATE pur_supplier SET credit_level='B' WHERE id=4");
  await c.execute("UPDATE pur_supplier SET credit_level='C' WHERE id=5");
  const [levels] = await c.execute('SELECT credit_level, COUNT(*) as cnt FROM pur_supplier WHERE deleted=0 GROUP BY credit_level');
  console.log('By level:', JSON.stringify(levels));
  await c.end();
}
main().catch(console.error);
