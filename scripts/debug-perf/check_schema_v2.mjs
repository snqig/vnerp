import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

// Parse .env manually
const env = readFileSync('D:/dcprint/erp-project/.env', 'utf8');
const envVars = {};
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) envVars[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const c = await mysql.createConnection({
  host: envVars.DB_HOST || '127.0.0.1',
  port: Number(envVars.DB_PORT) || 3306,
  user: envVars.DB_USER || 'root',
  password: envVars.DB_PASSWORD || '',
  database: envVars.DB_NAME || 'vnerpdacahng',
});

const [r1] = await c.query('DESCRIBE sys_company');
console.log('sys_company columns:', r1.map(r => r.Field).join(', '));

const [r2] = await c.query('DESCRIBE sys_role');
console.log('sys_role columns:', r2.map(r => r.Field).join(', '));

const [r3] = await c.query("SHOW TABLES LIKE 'inv_inbound%'");
console.log('inv_inbound tables:', r3.map(r => Object.values(r)[0]).join(', ') || '(none)');

await c.end();
