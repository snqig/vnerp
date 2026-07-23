const mysql = require('mysql2/promise');
async function main() {
  const c = await mysql.createConnection({
    host: '127.0.0.1', port: 3306, user: 'root',
    password: 'Snqig521223', database: 'vnerpdacahng', charset: 'utf8mb4',
  });
  // 检查 enum 列的实际值
  const [rows] = await c.execute(
    `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA='vnerpdacahng'
     AND (DATA_TYPE='enum' OR COLUMN_NAME IN ('status','qc_status','order_type','grn_type','outbound_type','issue_type'))
     AND TABLE_NAME IN ('inv_inbound_order','inv_outbound_order','prd_material_issue','prd_work_order','prd_schedule')
     ORDER BY TABLE_NAME, COLUMN_NAME`);
  rows.forEach(r => console.log(`${r.TABLE_NAME}.${r.COLUMN_NAME}: ${r.COLUMN_TYPE} (default=${r.COLUMN_DEFAULT})`));
  await c.end();
}
main().catch(console.error);
