/**
 * 执行 047 迁移：创建油墨配方版本管理三张表
 * 用法：node scripts/run-migration-047.mjs
 */
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

async function main() {
  const sqlFile = path.join(process.cwd(), 'database/migrations/047_create_ink_formula_version_tables.sql');
  const sql = fs.readFileSync(sqlFile, 'utf-8');

  const pool = mysql.createPool({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'Snqig521223',
    database: 'vnerpdacahng',
    multipleStatements: true,
  });

  try {
    console.log('[migration-047] Executing SQL...');
    await pool.query(sql);
    console.log('[migration-047] Migration completed successfully');

    const [tables] = await pool.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'dcprint_ink_%'`
    );
    console.log('[migration-047] Created tables:', tables.map((t) => t.TABLE_NAME));
  } catch (e) {
    console.error('[migration-047] Migration failed:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
