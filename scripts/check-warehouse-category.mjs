import mysql from 'mysql2/promise';

const db = await mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
});

console.log('-- inv_warehouse columns (check category_id) --');
const [cols] = await db.execute('SHOW COLUMNS FROM inv_warehouse');
for (const c of cols) console.log(`  ${c.Field} | ${c.Type}`);

console.log('\n-- sys_warehouse_category data --');
const [cat] = await db.execute('SELECT id, code, name, status FROM sys_warehouse_category ORDER BY id');
console.table(cat);

console.log('\n-- inv_warehouse data with category_id --');
const [wh] = await db.execute('SELECT id, warehouse_code, warehouse_name, warehouse_type, category_id FROM inv_warehouse ORDER BY id');
console.table(wh);

await db.end();
