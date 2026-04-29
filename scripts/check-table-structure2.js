const mysql = require('mysql2/promise');

async function checkTableStructure() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Snqig521223',
    database: 'vnerpdacahng'
  });

  const tables = [
    'crm_customer',
    'pur_request',
    'inv_warehouse'
  ];

  for (const table of tables) {
    try {
      const [columns] = await connection.execute(`DESCRIBE ${table}`);
      console.log(`\n=== ${table} ===`);
      columns.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type}`);
      });
    } catch (err) {
      console.log(`\n=== ${table} === 错误: ${err.message}`);
    }
  }

  await connection.end();
}

checkTableStructure().catch(console.error);
