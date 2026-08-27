// scripts/run-migration-021.mjs
// 直接执行 Migration 021 SQL 并记录到 sys_migration 表
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

async function main() {
  loadEnv();
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vnerpdacahng',
    multipleStatements: true,
  });

  try {
    const sqlPath = path.join(projectRoot, 'database', 'migrations', '021_qc_unqualified_add_update_by_and_fk.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    const statements = sqlContent
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    let success = 0;
    let failed = 0;
    for (const stmt of statements) {
      try {
        await conn.query(stmt);
        success++;
      } catch (e) {
        console.log(`  [SKIP] ${e.message}`);
        failed++;
      }
    }
    console.log(`Migration 021: ${success}/${success + failed} statements succeeded`);

    // 记录到 sys_migration
    const migrationName = '021_qc_unqualified_add_update_by_and_fk.sql';
    const [existing] = await conn.execute(
      'SELECT id FROM sys_migration WHERE migration_name = ?',
      [migrationName]
    );
    if (existing.length === 0) {
      const [maxBatch] = await conn.execute(
        'SELECT COALESCE(MAX(batch), 0) as max_batch FROM sys_migration'
      );
      const nextBatch = (maxBatch[0]?.max_batch || 0) + 1;
      await conn.execute(
        'INSERT INTO sys_migration (migration_name, batch, execution_time) VALUES (?, ?, ?)',
        [migrationName, nextBatch, 0]
      );
      console.log(`Recorded migration ${migrationName} in sys_migration (batch ${nextBatch})`);
    } else {
      console.log(`Migration ${migrationName} already recorded in sys_migration`);
    }

    // 验证最终表结构
    const [cols] = await conn.execute(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified'
       ORDER BY ORDINAL_POSITION`
    );
    console.log('\nFinal qc_unqualified columns:');
    for (const c of cols) {
      console.log(`  ${c.COLUMN_NAME} ${c.COLUMN_TYPE} ${c.IS_NULLABLE} DEFAULT=${c.COLUMN_DEFAULT}`);
    }
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
