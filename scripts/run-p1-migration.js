const mysql = require('mysql2/promise');

async function main() {
  const c = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Snqig521223',
    database: 'vnerpdacahng',
  });

  const migrations = [
    `ALTER TABLE inv_outbound_item ADD COLUMN is_raw_material TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否原料出库' AFTER width`,
    `ALTER TABLE prd_die_template ADD COLUMN category VARCHAR(64) NULL COMMENT '模板分类' AFTER storage_location`,
    `ALTER TABLE prd_die_template ADD COLUMN tags JSON NULL COMMENT '标签列表' AFTER category`,
    `ALTER TABLE prd_standard_card ADD COLUMN template_category VARCHAR(64) NULL COMMENT '模板分类' AFTER notes`,
    `ALTER TABLE prd_standard_card ADD COLUMN tags JSON NULL COMMENT '标签列表' AFTER template_category`,
  ];

  for (const sql of migrations) {
    try {
      await c.query(sql);
      console.log('OK:', sql.slice(0, 80));
    } catch (e) {
      console.error('ERR:', sql.slice(0, 60), '-', e.message);
    }
  }

  await c.end();
  console.log('Done.');
}

main().catch(console.error);
