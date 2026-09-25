import mysql2 from 'mysql2/promise';

async function main() {
  const conn = await mysql2.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'Snqig521223',
    database: 'vnerpdacahng',
  });

  const r1 = await conn.query(
    'SHOW COLUMNS FROM inv_outbound_item WHERE Field IN (?, ?, ?)',
    ['width', 'is_raw_material', 'specification']
  );
  console.log('inv_outbound_item:', JSON.stringify(r1[0].map((r: any) => r.Field)));

  const r2 = await conn.query(
    'SHOW COLUMNS FROM prd_die_template WHERE Field IN (?, ?)',
    ['category', 'tags']
  );
  console.log('prd_die_template:', JSON.stringify(r2[0].map((r: any) => r.Field)));

  const r3 = await conn.query(
    "SHOW COLUMNS FROM prd_standard_card WHERE Field IN ('template_category', 'tags')"
  );
  console.log('prd_standard_card:', JSON.stringify(r3[0].map((r: any) => r.Field)));

  await conn.end();
}

main().catch(console.error);
