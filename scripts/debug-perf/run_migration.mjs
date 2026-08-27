import mysql from 'mysql2/promise';
import fs from 'fs';
const env = fs.readFileSync('d:/dcprint/erp-project/.env', 'utf-8');
env.split('\n').forEach(l => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2]; });
const c = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: +process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
});
const sql = fs.readFileSync('d:/dcprint/erp-project/database/migrations/035_create_sys_notification.sql', 'utf-8');
await c.query(sql);
const [r] = await c.query("SHOW TABLES LIKE 'sys_notification'");
console.log('sys_notification created:', r);
await c.end();
