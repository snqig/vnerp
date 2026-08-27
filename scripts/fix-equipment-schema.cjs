const mysql = require('mysql2/promise');

const COLS = [
  { name: 'rated_capacity', def: 'DECIMAL(12,2) NULL DEFAULT NULL COMMENT \'额定产能\'' },
  { name: 'oee', def: 'DECIMAL(5,2) NULL DEFAULT NULL COMMENT \'设备综合效率OEE\'' },
];

(async () => {
  const conn = await mysql.createConnection({
    host: '127.0.0.1', port: 3306, user: 'root', password: 'Snqig521223', database: 'vnerpdacahng',
  });
  let added = 0;
  for (const c of COLS) {
    const [rows] = await conn.query(
      `SELECT COLUMN_NAME FROM information_schema.columns
       WHERE TABLE_SCHEMA='vnerpdacahng' AND TABLE_NAME='eq_equipment' AND COLUMN_NAME=?`,
      [c.name]
    );
    if (rows.length === 0) {
      await conn.query(`ALTER TABLE eq_equipment ADD COLUMN ${c.name} ${c.def}`);
      console.log('ADDED eq_equipment.' + c.name);
      added++;
    } else {
      console.log('EXISTS eq_equipment.' + c.name);
    }
  }
  console.log(`DONE (${added} column(s) added)`);
  await conn.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
