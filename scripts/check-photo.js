const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({
    host: '127.0.0.1', port: 3306, user: 'root',
    password: 'Snqig521223', database: 'vnerpdacahng'
  });
  const [cols] = await c.execute("SHOW COLUMNS FROM sys_employee LIKE 'photo'");
  console.log('Column:', JSON.stringify(cols, null, 2));
  const [rows] = await c.execute('SELECT id, name, photo FROM sys_employee ORDER BY id DESC LIMIT 5');
  console.log('Data:', JSON.stringify(rows, null, 2));
  await c.end();
})();
