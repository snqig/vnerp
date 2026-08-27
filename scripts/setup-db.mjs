/**
 * CLI 数据库初始化脚本（T003）
 * 用途：替代 HTTP /api/setup/create-tables 接口，作为标准初始化方式
 *
 * 安全特性：
 * - 所有配置从 .env 读取，无硬编码密码
 * - 仅本地/运维执行，不暴露为 HTTP 接口
 * - 不依赖 Next.js 服务运行
 *
 * 用法：
 *   pnpm setup:db              # 仅建表
 *   pnpm setup:db --seed       # 建表 + 导入种子数据
 *   node scripts/setup-db.mjs --seed
 *
 * 前置条件：
 *   1. .env 中配置 DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME
 *   2. MySQL 服务已启动
 *   3. database/vnerpdacahng_schema.sql 存在
 */
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// 手动加载 .env（避免引入 dotenv 依赖）
function loadEnv() {
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) {
    console.warn('[setup-db] ! 未找到 .env 文件，将使用默认值或环境变量');
    return;
  }
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

/**
 * 逐语句执行 SQL，单条失败不中断整体，返回成功/失败统计
 * 按分号分割（简单实现，忽略字符串内的分号——schema/seed 通常满足此假设）
 */
async function executeStatements(conn, sql, label) {
  // 移除注释行，按分号分割，过滤空语句
  const statements = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  let ok = 0;
  let fail = 0;
  const failures = [];
  for (const stmt of statements) {
    try {
      await conn.query(stmt);
      ok++;
    } catch (err) {
      fail++;
      const tableMatch = stmt.match(/(?:CREATE TABLE|INSERT IGNORE INTO|ALTER TABLE)\s+`?(\w+)`?/i);
      const tableName = tableMatch ? tableMatch[1] : '?';
      failures.push({ table: tableName, error: err.message.substring(0, 120) });
    }
  }
  console.log(`[setup-db] ✓ ${label}: 成功 ${ok} 条，失败 ${fail} 条`);
  if (failures.length > 0) {
    // 仅打印前 5 条失败，避免日志爆炸
    console.warn(`[setup-db] ! ${label} 失败明细（前 5 条）:`);
    for (const f of failures.slice(0, 5)) {
      console.warn(`    ${f.table}: ${f.error}`);
    }
    if (failures.length > 5) {
      console.warn(`    ... 其余 ${failures.length - 5} 条略`);
    }
  }
  return { ok, fail };
}

loadEnv();

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'vnerp';

const args = process.argv.slice(2);
const withSeed = args.includes('--seed');

async function run() {
  console.log(`[setup-db] 目标: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);

  let conn;
  try {
    // 1. 连接 MySQL（不指定数据库）
    conn = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      charset: 'utf8mb4',
      multipleStatements: true,
    });
    console.log('[setup-db] ✓ MySQL 已连接');

    // 2. 创建数据库（如不存在）
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_0900_ai_ci`
    );
    await conn.query(`USE \`${DB_NAME}\``);
    console.log(`[setup-db] ✓ 数据库 ${DB_NAME} 已就绪`);

    // 3. 执行 schema（逐语句容错，单条失败不中断整体）
    const schemaPath = path.join(projectRoot, 'database', 'vnerpdacahng_schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`schema 文件不存在: ${schemaPath}`);
    }
    let schemaSql = fs.readFileSync(schemaPath, 'utf8');
    // 预处理：移除 CREATE DATABASE / USE；CREATE TABLE → IF NOT EXISTS；
    // utf8mb4_ai_ci → utf8mb4_0900_ai_ci；INSERT → INSERT IGNORE
    schemaSql = schemaSql
      .replace(/CREATE DATABASE[^;]*;/gi, '')
      .replace(/USE\s+`?[^;]+`?;/gi, '')
      .replace(/CREATE TABLE\s+(?!IF NOT EXISTS)/gi, 'CREATE TABLE IF NOT EXISTS ')
      .replace(/utf8mb4_ai_ci/g, 'utf8mb4_0900_ai_ci')
      .replace(/\bINSERT\s+INTO\b/gi, 'INSERT IGNORE INTO');

    const schemaStats = await executeStatements(conn, schemaSql, 'schema');

    // 4. 可选：导入种子数据
    if (withSeed) {
      const seedPath = path.join(projectRoot, 'database', 'seeds', 'vnerp-seed-data.sql');
      if (fs.existsSync(seedPath)) {
        let seedSql = fs.readFileSync(seedPath, 'utf8');
        seedSql = seedSql.replace(/\bINSERT\s+INTO\b/gi, 'INSERT IGNORE INTO');
        await executeStatements(conn, seedSql, 'seed');
      } else {
        console.warn(`[setup-db] ! 种子文件不存在: ${seedPath}（跳过）`);
      }
    }

    // 5. 标记所有已有迁移文件为已执行（schema.sql 已包含全部结构，跳过增量迁移）
    const migrationsDir = path.join(projectRoot, 'database', 'migrations');
    if (fs.existsSync(migrationsDir)) {
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS \`sys_migration\` (
          id INT AUTO_INCREMENT PRIMARY KEY,
          migration_name VARCHAR(255) NOT NULL UNIQUE,
          batch INT NOT NULL DEFAULT 0,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          execution_time INT DEFAULT 0,
          INDEX idx_migration_name (migration_name),
          INDEX idx_applied_at (applied_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
      `);
      const migrationFiles = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql') || f.endsWith('.ts') || f.endsWith('.js'))
        .sort();
      let marked = 0;
      for (const f of migrationFiles) {
        try {
          await conn.execute(
            `INSERT IGNORE INTO \`sys_migration\` (migration_name, batch, execution_time) VALUES (?, 0, 0)`,
            [f]
          );
          const [res] = await conn.execute(
            `SELECT COUNT(*) as cnt FROM \`sys_migration\` WHERE migration_name = ?`,
            [f]
          );
          if (res[0].cnt > 0) marked++;
        } catch {
          // INSERT IGNORE 已处理重复，此处仅需跳过
        }
      }
      console.log(`[setup-db] ✓ 已标记 ${marked}/${migrationFiles.length} 个迁移文件为已执行（batch 0）`);
    }

    // 6. 统计表数量
    const [rows] = await conn.query(
      `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = ?`,
      [DB_NAME]
    );
    console.log(`[setup-db] ✓ 当前表数量: ${rows[0].cnt}`);
    console.log(
      withSeed
        ? '[setup-db] 完成（含种子数据）'
        : '[setup-db] 完成（如需种子数据请追加 --seed 参数）'
    );
  } catch (err) {
    console.error('[setup-db] ✗ 失败:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('  提示: MySQL 服务未启动，或 DB_HOST/DB_PORT 配置错误');
    }
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('  提示: 用户名或密码错误，请检查 .env 中 DB_USER/DB_PASSWORD');
    }
    if (err.code === 'ENOENT') {
      console.error('  提示: SQL 文件路径错误');
    }
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();
