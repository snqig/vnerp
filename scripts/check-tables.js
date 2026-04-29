const mysql = require('mysql2/promise');

async function checkTables() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Snqig521223',
    database: 'vnerpdacahng'
  });

  const [rows] = await connection.execute('SHOW TABLES');
  console.log('数据库中的表:');
  rows.forEach(row => {
    console.log('  -', Object.values(row)[0]);
  });

  await connection.end();
}

checkTables().catch(console.error);
