// scripts/export-schema.mjs
// 从目标数据库导出最新 schema，覆盖 database/vnerpdacahng_schema.sql
// 使用 SHOW CREATE TABLE 逐表导出 DDL，不包含数据
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

  const dbName = process.env.DB_NAME || 'vnerpdacahng';
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: dbName,
  });

  try {
    const [tables] = await conn.execute(
      `SELECT TABLE_NAME, TABLE_COMMENT
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ?
       ORDER BY TABLE_NAME`,
      [dbName]
    );

    console.log(`Found ${tables.length} tables in ${dbName}`);

    const lines = [];
    lines.push('-- ========================================================');
    lines.push('-- ERP 系统数据库设计（自动导出）');
    lines.push(`-- 数据库: ${dbName}`);
    lines.push('-- 字符集: utf8mb4');
    lines.push('-- 排序规则: utf8mb4_0900_ai_ci');
    lines.push('-- 连接信息: 通过 .env 环境变量管理，禁止在源码中硬编码');
    lines.push(`-- 导出时间: ${new Date().toISOString()}`);
    lines.push('-- 导出方式: SHOW CREATE TABLE（仅 DDL，不含数据）');
    lines.push('-- ========================================================');
    lines.push('');
    lines.push(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    lines.push('  DEFAULT CHARACTER SET utf8mb4');
    lines.push('  DEFAULT COLLATE utf8mb4_0900_ai_ci;');
    lines.push('');
    lines.push(`USE \`${dbName}\`;`);
    lines.push('');

    let fkCount = 0;
    let utf8mb4Count = 0;
    let bigintPkCount = 0;
    let totalTables = tables.length;

    for (const { TABLE_NAME, TABLE_COMMENT } of tables) {
      const [rows] = await conn.execute(`SHOW CREATE TABLE \`${TABLE_NAME}\``);
      const createSql = rows[0]['Create Table'];
      lines.push(`-- ${TABLE_COMMENT || TABLE_NAME}`);
      lines.push(createSql + ';');
      lines.push('');

      if (createSql.includes('FOREIGN KEY')) {
        const matches = createSql.match(/FOREIGN KEY/g);
        if (matches) fkCount += matches.length;
      }
      if (createSql.includes('utf8mb4_0900_ai_ci')) {
        utf8mb4Count++;
      }
      if (/\`id\`\s+BIGINT\s+UNSIGNED/i.test(createSql)) {
        bigintPkCount++;
      }
    }

    const outputPath = path.join(projectRoot, 'database', 'vnerpdacahng_schema.sql');
    fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');

    console.log(`\nSchema exported to: ${outputPath}`);
    console.log(`\nVerification metrics:`);
    console.log(`  Total tables: ${totalTables}`);
    console.log(`  Foreign keys: ${fkCount} (target: >=140)`);
    console.log(`  utf8mb4_0900_ai_ci tables: ${utf8mb4Count} (${((utf8mb4Count / totalTables) * 100).toFixed(1)}%, target: >=70%)`);
    console.log(`  BIGINT UNSIGNED PK tables: ${bigintPkCount} (${((bigintPkCount / totalTables) * 100).toFixed(1)}%, target: >=90%)`);

    const [deletedCols] = await conn.execute(
      `SELECT COUNT(DISTINCT TABLE_NAME) as cnt
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND COLUMN_NAME = 'deleted'`,
      [dbName]
    );
    console.log(`  Tables with 'deleted' column: ${deletedCols[0].cnt} (target: >=40)`);
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
