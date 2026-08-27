const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'Snqig521223',
    database: 'vnerpdacahng'
  });

  const [rows] = await conn.query('SELECT id, supplier_code, supplier_name, status, deleted FROM pur_supplier ORDER BY id');
  console.log(JSON.stringify(rows, null, 2));
  await conn.end();
}

main().catch(e => console.error('ERROR:', e.message));
