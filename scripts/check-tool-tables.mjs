import mysql from 'mysql2/promise';
const pool = mysql.createPool({ host: '127.0.0.1', port: 3306, user: 'root', password: 'Snqig521223', database: 'vnerpdacahng' });
async function main() {
  const conn = await pool.getConnection();
  try {
    const [tables] = await conn.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA='vnerpdacahng' AND (TABLE_NAME LIKE '%die%' OR TABLE_NAME LIKE '%screen%' OR TABLE_NAME LIKE '%tool%' OR TABLE_NAME LIKE 'dcprint%') ORDER BY TABLE_NAME"
    );
    console.log('=== die/screen/tool/dcprint tables ===');
    for (const t of tables) console.log('  ', t.TABLE_NAME);
    if (tables.length === 0) console.log('  (none)');
  } finally { conn.release(); await pool.end(); }
}
main().catch(e => { console.error(e.message); process.exit(1); });
