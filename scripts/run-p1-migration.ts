import mysql2 from 'mysql2/promise';
import * as fs from 'fs';

async function main() {
  const conn = await mysql2.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'Snqig521223',
    database: 'vnerpdacahng',
  });

  const sql = fs.readFileSync('database/migrations/20260922_add_p1_ui_columns.sql', 'utf8');
  const statements = sql.split(';').filter(s => s.trim());

  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (trimmed && !trimmed.startsWith('--')) {
      await conn.query(trimmed);
      console.log('OK:', trimmed.slice(0, 100));
    }
  }

  await conn.end();
  console.log('Migration completed.');
}

main().catch(console.error);
