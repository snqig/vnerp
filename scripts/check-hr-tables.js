const mysql = require('mysql2/promise');

async function checkTables() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Snqig521223',
    database: 'vnerpdacahng'
  });

  // 查看与人事相关的表
  const hrTables = ['sys_employee', 'sys_department', 'sys_user'];

  for (const table of hrTables) {
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
