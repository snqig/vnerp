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
    'pur_request_item',
    'inv_warehouse',
    'inv_inventory',
    'inv_inventory_log',
    'prd_standard_card',
    'sys_employee',
    'sample_order'
  ];

  for (const table of tables) {
    try {
      const [columns] = await connection.execute(`DESCRIBE ${table}`);
      console.log(`\n=== ${table} ===`);
      columns.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
      });
    } catch (err) {
      console.log(`\n=== ${table} === 错误: ${err.message}`);
    }
  }

  await connection.end();
}

checkTableStructure().catch(console.error);
