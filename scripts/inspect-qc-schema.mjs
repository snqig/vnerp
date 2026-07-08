import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function loadEnv() {
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vnerpdacahng',
});

const [migrationCols] = await conn.query('DESCRIBE sys_migration');
console.log('sys_migration columns:');
console.log(JSON.stringify(migrationCols, null, 2));

const [recentMigrations] = await conn.query('SELECT * FROM sys_migration ORDER BY id DESC LIMIT 5');
console.log('\nRecent migrations:');
console.log(JSON.stringify(recentMigrations, null, 2));

const [qcCols] = await conn.query('DESCRIBE qc_unqualified');
console.log('\nqc_unqualified columns:');
console.log(JSON.stringify(qcCols, null, 2));

await conn.end();
