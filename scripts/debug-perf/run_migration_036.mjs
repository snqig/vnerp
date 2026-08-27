import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

// Parse .env
const env = readFileSync('D:/dcprint/erp-project/.env', 'utf8');
const envVars = {};
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) envVars[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const sql = readFileSync('D:/dcprint/erp-project/database/migrations/036_fix_org_role_inbound_label_schema.sql', 'utf8');

const c = await mysql.createConnection({
  host: envVars.DB_HOST || '127.0.0.1',
  port: Number(envVars.DB_PORT) || 3306,
  user: envVars.DB_USER || 'root',
  password: envVars.DB_PASSWORD || '',
  database: envVars.DB_NAME || 'vnerpdacahng',
  multipleStatements: true,
});

try {
  // Split by semicolons, strip comment lines, filter empty
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.replace(/^--[^\n]*\n/gm, '').trim())
    .filter(s => s && !s.startsWith('--') && s.length > 3);

  for (const stmt of statements) {
    try {
      await c.query(stmt);
      const preview = stmt.substring(0, 80).replace(/\n/g, ' ');
      console.log(`  OK: ${preview}...`);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_DUP_KEYNAME' || e.errno === 1060 || e.errno === 1061) {
        console.log(`  SKIP (already exists): ${stmt.substring(0, 60).replace(/\n/g, ' ')}...`);
      } else {
        console.error(`  FAIL: ${e.message} :: ${stmt.substring(0, 80).replace(/\n/g, ' ')}`);
      }
    }
  }

  // Verify
  const [r1] = await c.query('DESCRIBE sys_company');
  console.log('\nsys_company columns:', r1.map(r => r.Field).join(', '));

  const [r2] = await c.query('DESCRIBE sys_role');
  console.log('sys_role columns:', r2.map(r => r.Field).join(', '));

  const [r3] = await c.query("SHOW TABLES LIKE 'inv_inbound_label'");
  console.log('inv_inbound_label exists:', r3.length > 0);

  console.log('\nMigration 036 completed.');
} finally {
  await c.end();
}
