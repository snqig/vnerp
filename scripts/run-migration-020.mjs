/**
 * 一次性脚本：直接执行 Migration 020 并记录到 sys_migration 表
 * 用法: node scripts/run-migration-020.mjs
 */
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

const sqlPath = path.join(projectRoot, 'database', 'migrations', '020_align_qc_unqualified_schema.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

// 解析 SQL：过滤注释行，按分号分割
const lines = sqlContent.split('\n').filter((l) => !l.trim().startsWith('--'));
const statements = lines
  .join('\n')
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vnerpdacahng',
    multipleStatements: false,
  });

  console.log(`🚀 开始执行 Migration 020 (${statements.length} 条语句)...`);

  let success = 0;
  let failed = 0;
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await conn.query(stmt);
      success++;
    } catch (err) {
      console.error(`❌ 语句 ${i + 1} 失败: ${err.message}`);
      console.error(`   SQL: ${stmt.substring(0, 120)}...`);
      failed++;
    }
  }

  console.log(`📊 执行完成: ${success} 成功, ${failed} 失败`);

  // 记录到 sys_migration 表
  try {
    await conn.query(
      `INSERT INTO sys_migration (migration_name, batch, applied_at, execution_time)
       VALUES (?, 5, NOW(), ?)
       ON DUPLICATE KEY UPDATE applied_at = NOW()`,
      ['020_align_qc_unqualified_schema.sql', success]
    );
    console.log('✅ 已记录到 sys_migration 表');
  } catch (err) {
    console.error(`⚠️  记录 sys_migration 失败: ${err.message}`);
  }

  // 验证表结构
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_COMMENT
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified'
     ORDER BY ORDINAL_POSITION`
  );
  console.log('\n📋 qc_unqualified 表结构:');
  for (const c of cols) {
    console.log(`  - ${c.COLUMN_NAME}: ${c.COLUMN_TYPE} (${c.COLUMN_COMMENT})`);
  }

  // 验证 qc_unqualified_handle 是否已删除
  const [tables] = await conn.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified_handle'`
  );
  if (tables.length === 0) {
    console.log('\n✅ qc_unqualified_handle 已删除');
  } else {
    console.log('\n⚠️  qc_unqualified_handle 仍存在');
  }

  await conn.end();
}

main().catch((err) => {
  console.error('💥 脚本异常:', err);
  process.exit(1);
});
