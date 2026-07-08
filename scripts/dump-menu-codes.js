const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'vnerpdacahng',
    charset: 'utf8mb4',
  });

  const [rows] = await connection.query(
    'SELECT id, menu_code, menu_name, parent_id, path FROM sys_menu WHERE status = 1 ORDER BY sort_order ASC'
  );

  console.log(JSON.stringify(rows, null, 2));
  console.error(`\nTotal menus: ${rows.length}`);

  await connection.end();
}

main().catch(console.error);
