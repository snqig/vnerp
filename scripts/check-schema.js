const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({ host: '127.0.0.1', user: 'root', password: 'Snqig521223', database: 'vnerpdacahng' });

  const [detail] = await c.query('SELECT * FROM sal_order_detail WHERE deleted=0 LIMIT 1');
  console.log('=== sal_order_detail sample cols ===', Object.keys(detail || {}).join(', '));

  const [eco] = await c.query('SELECT * FROM plm_eco WHERE deleted=0 LIMIT 1');
  console.log('=== plm_eco sample cols ===', Object.keys(eco || {}).join(', '));

  await c.end();
})();
