const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: '127.0.0.1',
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
  charset: 'utf8mb4',
  multipleStatements: true,
};

async function main() {
  let connection;
  
  try {
    console.log('正在连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');
    
    const menusFile = path.join(__dirname, '..', 'database', 'dcprint_menus.sql');
    console.log(`正在执行: ${menusFile}`);
    const sql = fs.readFileSync(menusFile, 'utf8');
    
    await connection.query(sql);
    console.log(`✅ 执行成功: ${menusFile}`);
    console.log('\n🎉 菜单脚本执行完成！');
    
  } catch (error) {
    console.error('\n❌ 执行过程中出现错误:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

main();
