const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runSQL() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'Snqig521223',
    database: 'vnerpdacahng',
    multipleStatements: true
  });

  try {
    const sqlFile = path.join(__dirname, 'purchase_request.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('开始执行采购申请数据库脚本...');
    await connection.query(sql);
    console.log('✅ 数据库表创建成功！');
    
    // 验证表是否创建成功
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'vnerpdacahng' 
      AND TABLE_NAME LIKE 'pur_%'
    `);
    
    console.log('\n已创建的表:');
    tables.forEach(t => console.log(`  - ${t.TABLE_NAME}`));
    
    // 验证数据
    const [requests] = await connection.query('SELECT COUNT(*) as count FROM pur_request');
    const [items] = await connection.query('SELECT COUNT(*) as count FROM pur_request_item');
    
    console.log(`\n测试数据:`);
    console.log(`  - 采购申请: ${requests[0].count} 条`);
    console.log(`  - 申请明细: ${items[0].count} 条`);
    
  } catch (error) {
    console.error('❌ 执行失败:', error.message);
  } finally {
    await connection.end();
  }
}

runSQL();
