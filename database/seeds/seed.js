// 用 Node.js 填充种子数据
import mysql from 'mysql2/promise';
import fs from 'fs';

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'yourpassword',
    database: 'vnerpdacahng'
  });
  // 读取SQL文件内容
  const sql = fs.readFileSync('./database/seeds/demo_seed_data.sql', 'utf-8');
  await conn.query(sql);
  await conn.end();
  console.log('🌱 Demo seed data inserted!');
})();