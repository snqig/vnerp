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
    
    // 执行采购订单生成脚本
    const purchaseOrdersFile = path.join(__dirname, 'generate_purchase_orders.sql');
    if (fs.existsSync(purchaseOrdersFile)) {
      await executeSqlFile(connection, purchaseOrdersFile);
    } else {
      console.error(`❌ 找不到文件: ${purchaseOrdersFile}`);
      process.exit(1);
    }
    
    console.log('\n🎉 采购订单测试数据生成完成！');
    
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