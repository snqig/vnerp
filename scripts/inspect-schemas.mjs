import mysql from 'mysql2/promise';

const db = await mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
});

const tables = ['fin_receivable', 'inv_inbound_order', 'inv_inventory', 'pur_supplier', 'prd_bom', 'prd_bom_detail'];

for (const t of tables) {
  console.log(`\n========== ${t} ==========`);
  try {
    const [cols] = await db.execute(`SHOW COLUMNS FROM ${t}`);
    for (const c of cols) {
      console.log(`  ${c.Field} | ${c.Type} | null=${c.Null} | default=${c.Default}`);
    }
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
  }
}

await db.end();
