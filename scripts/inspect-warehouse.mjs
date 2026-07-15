import mysql from 'mysql2/promise';

const db = await mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
});

for (const t of ['inv_warehouse', 'inv_warehouse_category']) {
  console.log(`\n-- ${t} --`);
  try {
    const [cols] = await db.execute(`SHOW COLUMNS FROM ${t}`);
    for (const c of cols) console.log(`  ${c.Field} | ${c.Type} | null=${c.Null}`);
  } catch (e) { console.log('  ERR:', e.message); }
}

await db.end();
