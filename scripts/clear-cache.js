const mysql = require('mysql2/promise');

const dbConfig = {
  host: '127.0.0.1',
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
  charset: 'utf8mb4',
};

async function main() {
  let connection;
  
  try {
    console.log('正在连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功\n');
    
    // 检查是否有权限缓存表
    const [tables] = await connection.query(
      "SHOW TABLES LIKE '%cache%'"
    );
    
    if (tables.length === 0) {
      console.log('没有找到缓存表，尝试清除内存中的缓存...');
      console.log('\n💡 提示：请重新登录系统以刷新菜单');
    } else {
      console.log(`找到 ${tables.length} 个缓存表：`);
      for (const table of tables) {
        const tableName = Object.values(table)[0];
        console.log(`  - ${tableName}`);
      }
      
      // 清空所有缓存表
      console.log('\n正在清空缓存表...');
      for (const table of tables) {
        const tableName = Object.values(table)[0];
        await connection.query(`TRUNCATE TABLE \`${tableName}\``);
        console.log(`  ✅ 已清空: ${tableName}`);
      }
    }
    
    console.log('\n🎉 缓存清除完成！请重新登录系统以刷新菜单');
    
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error('\n💡 提示：请尝试重新登录系统');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
