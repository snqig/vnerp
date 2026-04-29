const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// 数据库配置
const dbConfig = {
  host: '127.0.0.1',
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
  charset: 'utf8mb4',
  multipleStatements: true, // 允许多条语句
};

// 执行 SQL 文件的函数
async function executeSqlFile(connection, filePath) {
  console.log(`正在执行: ${filePath}`);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  try {
    await connection.query(sql);
    console.log(`✅ 执行成功: ${filePath}`);
  } catch (error) {
    console.error(`❌ 执行失败: ${filePath}`);
    console.error(error.message);
    throw error;
  }
}

async function main() {
  let connection;
  
  try {
    // 创建连接
    console.log('正在连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');
    
    // 执行迁移脚本
    const migrationFile = path.join(__dirname, '..', 'database', 'dcprint_migration.sql');
    if (fs.existsSync(migrationFile)) {
      await executeSqlFile(connection, migrationFile);
    } else {
      console.error(`❌ 找不到文件: ${migrationFile}`);
    }
    
    // 执行菜单脚本
    const menusFile = path.join(__dirname, '..', 'database', 'dcprint_menus.sql');
    if (fs.existsSync(menusFile)) {
      await executeSqlFile(connection, menusFile);
    } else {
      console.error(`❌ 找不到文件: ${menusFile}`);
    }
    
    console.log('\n🎉 所有脚本执行完成！');
    
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
