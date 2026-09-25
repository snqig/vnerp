import mysql2 from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const conn = await mysql2.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vnerpdacahng',
  });

  // Check inv_outbound_item columns
  const r1 = await conn.query(
    'SHOW COLUMNS FROM inv_outbound_item WHERE Field IN (?, ?, ?)',
    ['width', 'is_raw_material', 'specification']
  );
  console.log('inv_outbound_item:', JSON.stringify(r1[0].map((r: any) => r.Field)));

  // Check prd_die_template columns
  const r2 = await conn.query(
    'SHOW COLUMNS FROM prd_die_template WHERE Field IN (?, ?)',
    ['category', 'tags']
  );
  console.log('prd_die_template:', JSON.stringify(r2[0].map((r: any) => r.Field)));

  // Check prd_standard_card columns
  const r3 = await conn.query(
    "SHOW COLUMNS FROM prd_standard_card WHERE Field IN ('template_category', 'tags')"
  );
  console.log('prd_standard_card:', JSON.stringify(r3[0].map((r: any) => r.Field)));

  await conn.end();
}

main().catch(console.error);
