const mysql = require('mysql2/promise');

async function checkTables() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Snqig521223',
    database: 'vnerpdacahng'
  });

  // 查看与生产流程相关的表
  const processTables = [
    'prd_process_card',
    'prd_process_card_material',
    'prd_standard_card',
    'inv_cutting_record',
    'inv_cutting_detail',
    'inv_trace_record',
    'inv_trace_detail'
  ];

  for (const table of processTables) {
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
