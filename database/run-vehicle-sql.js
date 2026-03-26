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
    const sqlFile = path.join(__dirname, 'delivery_vehicles.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('开始执行车辆管理数据库脚本...');
    await connection.query(sql);
    console.log('✅ 数据库表创建成功！');
    
    // 验证表是否创建成功
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'vnerpdacahng' 
      AND TABLE_NAME LIKE 'delivery_%'
    `);
    
    console.log('\n已创建的表:');
    tables.forEach(t => console.log(`  - ${t.TABLE_NAME}`));
    
    // 验证数据
    const [vehicles] = await connection.query('SELECT COUNT(*) as count FROM delivery_vehicle');
    const [drivers] = await connection.query('SELECT COUNT(*) as count FROM delivery_driver');
    
    console.log(`\n测试数据:`);
    console.log(`  - 车辆: ${vehicles[0].count} 条`);
    console.log(`  - 司机: ${drivers[0].count} 条`);
    
  } catch (error) {
    console.error('❌ 执行失败:', error.message);
  } finally {
    await connection.end();
  }
}

runSQL();
