// scripts/run-pending-migrations.mjs
// 执行所有未记录在 sys_migration 表中的迁移文件
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
    // Ensure sys_migration table exists
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS sys_migration (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        batch INT NOT NULL DEFAULT 1,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_time INT DEFAULT 0,
        INDEX idx_migration_name (migration_name),
        INDEX idx_applied_at (applied_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // Get applied migrations
    const [applied] = await conn.execute(
      'SELECT migration_name FROM sys_migration ORDER BY id ASC'
    );
    const appliedSet = new Set(applied.map((r) => r.migration_name));

    // Get all migration files
    const migrationsDir = path.join(projectRoot, 'database', 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const pending = files.filter((f) => !appliedSet.has(f));
    console.log(`Total migration files: ${files.length}`);
    console.log(`Already applied: ${appliedSet.size}`);
    console.log(`Pending: ${pending.length}`);
    console.log('\nPending migrations:');
    for (const f of pending) {
      console.log(`  ${f}`);
    }

    if (pending.length === 0) {
      console.log('\nNo pending migrations.');
      return;
    }

    // Get next batch number
    const [maxBatch] = await conn.execute(
      'SELECT COALESCE(MAX(batch), 0) as max_batch FROM sys_migration'
    );
    let batch = (maxBatch[0]?.max_batch || 0) + 1;

    console.log(`\nStarting batch ${batch}...`);

    let totalOk = 0;
    let totalFail = 0;
    let totalSkip = 0;

    for (const file of pending) {
      const filePath = path.join(migrationsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');

      // Split into statements: remove comment lines, split by semicolon
      const statements = content
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const startTime = Date.now();
      let ok = 0;
      let fail = 0;
      const failures = [];

      for (const stmt of statements) {
        try {
          await conn.query(stmt);
          ok++;
        } catch (err) {
          fail++;
          // Classify: duplicate column/key errors are benign (idempotent)
          const msg = err.message;
          if (
            msg.includes('Duplicate column') ||
            msg.includes('Duplicate key name') ||
            msg.includes('Already exists') ||
            msg.includes("Can't DROP") ||
            msg.includes('check that column/key exists')
          ) {
            // Idempotent — count as skip
          } else {
            failures.push({ error: msg.substring(0, 150), snippet: stmt.substring(0, 80) });
          }
        }
      }

      const elapsed = Date.now() - startTime;

      // Record in sys_migration
      await conn.execute(
        'INSERT INTO sys_migration (migration_name, batch, execution_time) VALUES (?, ?, ?)',
        [file, batch, elapsed]
      );

      console.log(
        `\n[${file}] ${ok} ok, ${fail} failed (${elapsed}ms)`
      );
      if (failures.length > 0) {
        console.log(`  Non-idempotent failures (${failures.length}):`);
        for (const f of failures.slice(0, 3)) {
          console.log(`    ${f.error}`);
          console.log(`    SQL: ${f.snippet}...`);
        }
      }

      totalOk += ok;
      totalFail += fail;
      batch++;
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total statements: ${totalOk + totalFail}`);
    console.log(`Successful: ${totalOk}`);
    console.log(`Failed (incl. idempotent): ${totalFail}`);

    // Final FK count
    const [fkCount] = await conn.execute(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [process.env.DB_NAME || 'vnerpdacahng']
    );
    console.log(`\nFinal FK count: ${fkCount[0].cnt}`);
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
