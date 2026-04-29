const mysql = require('mysql2/promise');

async function checkTables() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Snqig521223',
    database: 'vnerpdacahng'
  });

  // 查看所有表
  const [tables] = await connection.execute('SHOW TABLES');
  console.log('数据库中的所有表:');
  tables.forEach(row => {
    const tableName = Object.values(row)[0];
    console.log(`  - ${tableName}`);
  });

  // 查看与生产相关的表结构
  const productionTables = ['prd_process_card', 'prd_standard_card', 'prd_process_card_material'];
  
  for (const table of productionTables) {
    try {
      const [columns] = await connection.execute(`DESCRIBE ${table}`);
      console.log(`\n=== ${table} ===`);
      columns.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type}`);
      });
    } catch (err) {
      console.log(`\n=== ${table} === 不存在或错误: ${err.message}`);
    }
  }

  await connection.end();
}

checkTables().catch(console.error);
