const mysql = require('../erp-project/node_modules/mysql2/promise');
const fs = require('fs');
const path = require('path');

// 数据库配置
const config = {
  host: '127.0.0.1',
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
  charset: 'utf8mb4',
  multipleStatements: true  // 允许多条语句
};

async function initDatabase() {
  let connection;
  
  try {
    // 先连接MySQL（不指定数据库）
    console.log('正在连接MySQL...');
    connection = await mysql.createConnection({
      host: config.host,
      user: config.user,
      password: config.password,
      charset: config.charset
    });
    
    console.log('✓ MySQL连接成功');
    
    // 创建数据库
    console.log(`正在创建数据库 ${config.database}...`);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.database}\` 
       DEFAULT CHARACTER SET utf8mb4 
       DEFAULT COLLATE utf8mb4_0900_ai_ci`
    );
    console.log('✓ 数据库创建成功');
    
    // 切换到新数据库
    await connection.query(`USE \`${config.database}\``);
    console.log(`✓ 已切换到数据库 ${config.database}`);
    
    // 读取SQL文件
    const sqlFilePath = path.join(__dirname, 'vnerpdacahng_schema.sql');
    console.log(`正在读取SQL文件: ${sqlFilePath}`);
    
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL文件不存在: ${sqlFilePath}`);
    }
    
    let sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // 移除创建数据库的语句（因为我们已经创建了）
    sqlContent = sqlContent.replace(/CREATE DATABASE.*?;/gs, '');
    sqlContent = sqlContent.replace(/USE \`.*?\`;/g, '');
    
    console.log('✓ SQL文件读取成功');
    
    // 按段落分割SQL（以 ENGINE=InnoDB 为分隔）
    const statements = sqlContent
      .split(/(?=CREATE TABLE|INSERT INTO)/)
      .map(s => s.trim())
      .filter(s => s.length > 10 && !s.startsWith('--'));
    
    console.log(`共 ${statements.length} 个SQL块需要执行\n`);
    
    // 执行SQL语句
    console.log('开始执行SQL语句...');
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const tableName = statement.match(/CREATE TABLE\s+`?(\w+)`?/)?.[1] || 
                       statement.match(/INSERT INTO\s+`?(\w+)`?/)?.[1] || 
                       'Unknown';
      
      try {
        await connection.query(statement);
        successCount++;
        console.log(`✓ [${i + 1}/${statements.length}] ${tableName}`);
      } catch (error) {
        errorCount++;
        console.error(`✗ [${i + 1}/${statements.length}] ${tableName}`);
        console.error(`  错误: ${error.message.substring(0, 100)}`);
      }
    }
    
    console.log('\n========================================');
    console.log('数据库初始化完成！');
    console.log('========================================');
    console.log(`成功: ${successCount} 个对象`);
    console.log(`失败: ${errorCount} 个对象`);
    console.log(`\n数据库: ${config.database}`);
    console.log(`字符集: utf8mb4`);
    console.log(`排序规则: utf8mb4_0900_ai_ci`);
    
    // 查询创建的表数量
    const [tables] = await connection.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = '${config.database}'
    `);
    console.log(`\n已创建 ${tables[0].count} 张表`);
    
  } catch (error) {
    console.error('\n✗ 数据库初始化失败:');
    console.error(error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n提示: 请确保MySQL服务已启动');
      console.error('      检查MySQL是否安装在 127.0.0.1:3306');
    }
    if (error.message.includes('Access denied')) {
      console.error('\n提示: 请检查用户名和密码是否正确');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✓ 数据库连接已关闭');
    }
  }
}

// 运行初始化
initDatabase();
