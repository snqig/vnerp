const mysql = require('mysql2/promise');
(async () => {
  const db = mysql.createPool({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'Snqig521223',
    database: 'vnerpdacahng',
  });
  const [rows] = await db.query("SELECT id, username, first_login, status FROM sys_user WHERE username='admin'");
  console.log('Before:', JSON.stringify(rows, null, 2));
  await db.query("UPDATE sys_user SET first_login = 0 WHERE username='admin'");
  const [after] = await db.query("SELECT id, username, first_login FROM sys_user WHERE username='admin'");
  console.log('After:', JSON.stringify(after, null, 2));
  await db.end();
  console.log('Done');
})();
