const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runSQL() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Snqig521223',
    database: 'vnerpdacahng',
    multipleStatements: true
  });

  try {
    const sqlFile = path.join(__dirname, 'update_standard_card.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('正在执行 SQL 脚本...');
    await connection.query(sql);
    console.log('SQL 脚本执行成功！');
    
  } catch (error) {
    console.error('执行失败:', error);
  } finally {
    await connection.end();
  }
}

runSQL();
