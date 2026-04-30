const mysql = require('mysql2/promise');

async function main() {
  const c = await mysql.createConnection({
    host: '127.0.0.1', user: 'root', password: 'Snqig521223', database: 'vnerpdacahng' });

  const tables = ['eng_sample_to_mass', 'eng_sop', 'prd_die_template', 'prd_process_card'];

  for (const table of tables) {
    try {
      const [cols] = await c.execute(
        'SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION',
        ['vnerpdacahng', table]
      );
      const [cnt] = await c.execute(`SELECT COUNT(*) as cnt FROM ${table}`);
      console.log(`\n=== ${table} (${cnt[0].cnt} rows) ===`);
      for (const col of cols) {
        console.log(`  ${col.COLUMN_NAME} (${col.DATA_TYPE}) nullable=${col.IS_NULLABLE} default=${col.COLUMN_DEFAULT}`);
      }
    } catch (e) {
      console.log(`\n=== ${table}: ERROR - ${e.message} ===`);
    }
  }

  await c.end();
}

main().catch(console.error);
