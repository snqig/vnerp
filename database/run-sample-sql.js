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
    const sqlFile = path.join(__dirname, 'sample_orders.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('开始执行打样单数据库脚本...');
    await connection.query(sql);
    console.log('✅ 数据库表创建成功！');
    
    // 验证表是否创建成功
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'vnerpdacahng' 
      AND TABLE_NAME = 'sample_order'
    `);
    
    if (tables.length > 0) {
      console.log('\n✅ 表 sample_order 创建成功');
    }
    
    // 验证数据
    const [count] = await connection.query('SELECT COUNT(*) as count FROM sample_order');
    console.log(`✅ 测试数据: ${count[0].count} 条打样单记录`);
    
  } catch (error) {
    console.error('❌ 执行失败:', error.message);
  } finally {
    await connection.end();
  }
}

runSQL();
