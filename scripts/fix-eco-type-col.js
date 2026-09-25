const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({ host: '127.0.0.1', user: 'root', password: 'Snqig521223', database: 'vnerpdacahng' });
  await c.execute("ALTER TABLE plm_eco MODIFY COLUMN eco_type VARCHAR(20) NULL");
  const [cols] = await c.query("SHOW COLUMNS FROM plm_eco WHERE Field='eco_type'");
  console.log('eco_type 修改后:', cols[0]);
  await c.end();
  console.log('✅ 完成');
})();
