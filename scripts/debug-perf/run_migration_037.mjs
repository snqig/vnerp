/**
 * Migration 037 runner: migrate pur_purchase_order status=2 → status=10
 *
 * Usage: node scripts/debug-perf/run_migration_037.mjs
 *
 * Outputs before/after status distributions so you can verify the migration.
 */
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

// Parse .env manually (dotenv may not be installed in all environments)
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

try {
  // 1. Before
  console.log('=== 迁移前: pur_purchase_order 状态分布 ===');
  const [before] = await c.query(
    `SELECT status, COUNT(*) AS cnt FROM pur_purchase_order WHERE deleted = 0 GROUP BY status ORDER BY status`
  );
  before.forEach((r) => console.log(`  status=${r.status}: ${r.cnt} 行`));

  // 2. Migrate
  const [result] = await c.query(
    `UPDATE pur_purchase_order SET status = 10, update_time = NOW() WHERE status = 2 AND deleted = 0`
  );
  console.log(`\n=== 迁移执行 ===`);
  console.log(`  UPDATE affected ${result.affectedRows} 行 (status=2 → status=10)`);

  // 3. After
  console.log('\n=== 迁移后: pur_purchase_order 状态分布 ===');
  const [after] = await c.query(
    `SELECT status, COUNT(*) AS cnt FROM pur_purchase_order WHERE deleted = 0 GROUP BY status ORDER BY status`
  );
  after.forEach((r) => console.log(`  status=${r.status}: ${r.cnt} 行`));

  // 4. Verify no status=2 remains
  const [remaining] = await c.query(
    `SELECT COUNT(*) AS cnt FROM pur_purchase_order WHERE status = 2 AND deleted = 0`
  );
  console.log(`\n=== 验证 ===`);
  console.log(`  剩余 status=2 行数: ${remaining[0].cnt}`);

  if (remaining[0].cnt === 0) {
    console.log('  ✅ 迁移成功完成');
  } else {
    console.log('  ⚠️  仍有未迁移的行，请检查');
  }
} finally {
  await c.end();
}
