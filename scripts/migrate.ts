/**
 * 数据库迁移管理脚本
 *
 * 功能：
 * 1. 迁移记录管理（版本记录表）
 * 2. 执行迁移（up）
 * 3. 回滚迁移（down）
 * 4. 查看迁移历史和状态
 * 5. 创建新迁移文件模板
 *
 * 用法：
 *   npx tsx scripts/migrate.ts status           # 查看迁移状态
 *   npx tsx scripts/migrate.ts up               # 执行所有未执行的迁移
 *   npx tsx scripts/migrate.ts up --count 1     # 执行指定数量的迁移
 *   npx tsx scripts/migrate.ts down             # 回滚最后一个迁移
 *   npx tsx scripts/migrate.ts down --count 2   # 回滚指定数量的迁移
 *   npx tsx scripts/migrate.ts down --all       # 回滚所有迁移
 *   npx tsx scripts/migrate.ts history          # 查看迁移历史
 *   npx tsx scripts/migrate.ts create <name>    # 创建新迁移文件
 *   npx tsx scripts/migrate.ts reset            # 重置（回滚所有 + 重新执行）
 *
 * 迁移文件格式：
 *   - 文件名: YYYYMMDDHHMMSS_<description>.ts
 *   - 导出: up(conn) - 正向迁移
 *   - 导出: down(conn) - 回滚操作
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const migrationsDir = path.join(projectRoot, 'database', 'migrations');

const MIGRATIONS_TABLE = 'sys_migration';

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

async function getConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vnerpdacahng',
    multipleStatements: true,
  });
}

async function ensureMigrationsTable(conn) {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS \`${MIGRATIONS_TABLE}\` (
      id INT AUTO_INCREMENT PRIMARY KEY,
      migration_name VARCHAR(255) NOT NULL UNIQUE,
      batch INT NOT NULL DEFAULT 1,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      execution_time INT DEFAULT 0,
      INDEX idx_migration_name (migration_name),
      INDEX idx_applied_at (applied_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
}

function getMigrationFiles() {
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.sql'))
    .sort();
}

async function getAppliedMigrations(conn) {
  const [rows] = await conn.execute(
    `SELECT migration_name, batch, applied_at FROM \`${MIGRATIONS_TABLE}\` ORDER BY id ASC`
  );
  return rows.map((r) => r.migration_name);
}

async function getPendingMigrations(conn) {
  const files = getMigrationFiles();
  const applied = await getAppliedMigrations(conn);
  return files.filter((f) => !applied.includes(f));
}

async function executeMigration(conn, fileName, direction = 'up') {
  const filePath = path.join(migrationsDir, fileName);
  const startTime = Date.now();

  try {
    if (fileName.endsWith('.sql')) {
      if (direction === 'down') {
        throw new Error(`SQL 迁移文件 ${fileName} 不支持回滚（down），请手动处理`);
      }
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      const statements = sqlContent
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const stmt of statements) {
        await conn.query(stmt);
      }
    } else {
      const migration = await import(filePath);
      const fn = migration[direction];

      if (typeof fn !== 'function') {
        throw new Error(`迁移文件 ${fileName} 缺少 ${direction} 函数`);
      }

      await fn(conn);
    }

    const executionTime = Date.now() - startTime;

    if (direction === 'up') {
      const [maxBatch] = await conn.execute(
        `SELECT COALESCE(MAX(batch), 0) as max_batch FROM \`${MIGRATIONS_TABLE}\``
      );
      const nextBatch = (maxBatch[0]?.max_batch || 0) + 1;

      await conn.execute(
        `INSERT INTO \`${MIGRATIONS_TABLE}\` (migration_name, batch, execution_time) VALUES (?, ?, ?)`,
        [fileName, nextBatch, executionTime]
      );
    } else {
      await conn.execute(
        `DELETE FROM \`${MIGRATIONS_TABLE}\` WHERE migration_name = ?`,
        [fileName]
      );
    }

    return { success: true, time: executionTime };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function cmdStatus() {
  const conn = await getConnection();
  try {
    await ensureMigrationsTable(conn);

    const files = getMigrationFiles();
    const applied = await getAppliedMigrations(conn);
    const pending = files.filter((f) => !applied.includes(f));

    console.log('\n📊 迁移状态');
    console.log('─'.repeat(50));
    console.log(`  总迁移文件: ${files.length}`);
    console.log(`  已执行:     ${applied.length}`);
    console.log(`  待执行:     ${pending.length}`);
    console.log('');

    if (pending.length > 0) {
      console.log('📋 待执行的迁移:');
      pending.forEach((f, i) => {
        console.log(`   ${i + 1}. ${f}`);
      });
      console.log('');
    }

    if (applied.length > 0) {
      console.log('✅ 已执行的迁移（最近10个）:');
      const recent = applied.slice(-10).reverse();
      recent.forEach((f, i) => {
        console.log(`   ${applied.length - i}. ${f}`);
      });
      console.log('');
    }
  } finally {
    await conn.end();
  }
}

async function cmdUp(count = 0) {
  const conn = await getConnection();
  try {
    await ensureMigrationsTable(conn);

    const pending = await getPendingMigrations(conn);

    if (pending.length === 0) {
      console.log('\n✅ 没有待执行的迁移');
      return;
    }

    const toRun = count > 0 ? pending.slice(0, count) : pending;

    console.log(`\n🚀 开始执行迁移 (${toRun.length} 个)...\n`);

    let successCount = 0;
    let failed = false;

    for (const fileName of toRun) {
      const result = await executeMigration(conn, fileName, 'up');
      if (result.success) {
        console.log(`  ✅ ${fileName} (${result.time}ms)`);
        successCount++;
      } else {
        console.log(`  ❌ ${fileName}: ${result.error}`);
        failed = true;
        break;
      }
    }

    console.log(`\n📊 迁移完成: ${successCount}/${toRun.length} 成功`);

    if (failed) {
      process.exit(1);
    }
  } finally {
    await conn.end();
  }
}

async function cmdDown(count = 1, all = false) {
  const conn = await getConnection();
  try {
    await ensureMigrationsTable(conn);

    const applied = await getAppliedMigrations(conn);

    if (applied.length === 0) {
      console.log('\n⚠️  没有可回滚的迁移');
      return;
    }

    const toRollback = all ? [...applied].reverse() : applied.slice(-count).reverse();

    console.log(`\n⚠️  开始回滚迁移 (${toRollback.length} 个)...\n`);

    let successCount = 0;
    let failed = false;

    for (const fileName of toRollback) {
      const result = await executeMigration(conn, fileName, 'down');
      if (result.success) {
        console.log(`  ✅ 回滚: ${fileName} (${result.time}ms)`);
        successCount++;
      } else {
        console.log(`  ❌ 回滚失败 ${fileName}: ${result.error}`);
        failed = true;
        break;
      }
    }

    console.log(`\n📊 回滚完成: ${successCount}/${toRollback.length} 成功`);

    if (failed) {
      process.exit(1);
    }
  } finally {
    await conn.end();
  }
}

async function cmdHistory() {
  const conn = await getConnection();
  try {
    await ensureMigrationsTable(conn);

    const [rows] = await conn.execute(
      `SELECT migration_name, batch, applied_at, execution_time FROM \`${MIGRATIONS_TABLE}\` ORDER BY id DESC LIMIT 50`
    );

    console.log('\n📜 迁移历史（最近50条）');
    console.log('─'.repeat(80));
    console.log('  Batch  迁移名称                     执行时间    执行时间');
    console.log('─'.repeat(80));

    for (const row of rows) {
      const name = row.migration_name.padEnd(30);
      const time = row.applied_at?.toISOString?.() || String(row.applied_at);
      const execTime = `${row.execution_time || 0}ms`.padEnd(10);
      console.log(`  ${String(row.batch).padEnd(6)} ${name} ${execTime} ${time}`);
    }

    console.log('');
  } finally {
    await conn.end();
  }
}

function cmdCreate(name) {
  if (!name) {
    console.error('❌ 请指定迁移名称，例如: migrate create add_user_table');
    process.exit(1);
  }

  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  const now = new Date();
  const timestamp =
    now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');

  const fileName = `${timestamp}_${name}.ts`;
  const filePath = path.join(migrationsDir, fileName);

  const template = `/**
 * ${name}
 *
 * 正向迁移 (up):   执行变更
 * 反向迁移 (down): 回滚变更
 */

import { Connection } from 'mysql2/promise';

export async function up(conn: Connection): Promise<void> {
  // 在此编写正向迁移 SQL
  // await conn.execute('ALTER TABLE ... ADD COLUMN ...');
}

export async function down(conn: Connection): Promise<void> {
  // 在此编写反向迁移 SQL（回滚）
  // await conn.execute('ALTER TABLE ... DROP COLUMN ...');
}
`;

  fs.writeFileSync(filePath, template, 'utf8');
  console.log(`✅ 迁移文件已创建: database/migrations/${fileName}`);
}

function showHelp() {
  console.log(`
数据库迁移管理工具

用法:
  npx tsx scripts/migrate.ts <命令> [选项]

命令:
  status              查看迁移状态
  up                  执行所有未执行的迁移
  up --count <n>      执行前 n 个待执行迁移
  down                回滚最后 1 个迁移
  down --count <n>    回滚最后 n 个迁移
  down --all          回滚所有迁移
  history             查看迁移历史
  create <名称>       创建新的迁移文件
  reset               重置（回滚所有 + 重新执行所有）
  help                显示帮助

示例:
  # 查看状态
  npx tsx scripts/migrate.ts status

  # 执行所有迁移
  npx tsx scripts/migrate.ts up

  # 执行 1 个迁移
  npx tsx scripts/migrate.ts up --count 1

  # 回滚最后 1 个
  npx tsx scripts/migrate.ts down

  # 回滚最后 3 个
  npx tsx scripts/migrate.ts down --count 3

  # 创建新迁移
  npx tsx scripts/migrate.ts create add_product_table
`);
}

async function main() {
  loadEnv();

  const args = process.argv.slice(2);
  const command = args[0] || 'status';

  const countIdx = args.indexOf('--count');
  const count = countIdx > -1 ? parseInt(args[countIdx + 1] || '1') : 1;
  const all = args.includes('--all');

  switch (command) {
    case 'status':
      await cmdStatus();
      break;
    case 'up':
      await cmdUp(countIdx > -1 ? count : 0);
      break;
    case 'down':
      await cmdDown(count, all);
      break;
    case 'history':
      await cmdHistory();
      break;
    case 'create':
      cmdCreate(args[1]);
      break;
    case 'reset':
      console.log('\n⚠️  即将重置所有迁移，此操作不可撤销！');
      await cmdDown(0, true);
      await cmdUp(0);
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      console.error(`❌ 未知命令: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main();
