const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({ host: '127.0.0.1', user: 'root', password: 'Snqig521223', database: 'vnerpdacahng' });
  const [cols] = await c.query("SHOW COLUMNS FROM plm_eco");
  console.log('=== plm_eco columns ===');
  for (const col of cols) console.log(`  ${col.Field}  ${col.Type}  Null=${col.Null}  Key=${col.Key}`);
  const [idx] = await c.query("SHOW INDEX FROM sal_order");
  console.log('\n=== sal_order indexes ===');
  for (const i of idx) console.log(`  ${i.Key_name}  ${i.Column_name}`);
  const [cols2] = await c.query("SHOW COLUMNS FROM sal_order_detail");
  console.log('\n=== sal_order_detail columns ===');
  for (const col of cols2) console.log(`  ${col.Field}  ${col.Type}  Null=${col.Null}  Key=${col.Key}`);
  await c.end();
})();
