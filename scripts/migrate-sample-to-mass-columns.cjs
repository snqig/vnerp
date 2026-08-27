/**
 * 一次性迁移：补齐 eng_sample_to_mass 缺失列（对齐 init/supplement-tables 与 init/data-logic 两份建表定义）
 * 幂等：逐个探测 information_schema，仅补不存在的列。
 * 运行：node scripts/migrate-sample-to-mass-columns.cjs
 */
const mysql = require('mysql2/promise');

const cfg = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
};

// [列名, 类型, 注释] —— 仅补充线上表当前缺失的列
const COLUMNS = [
  ['transfer_no', 'VARCHAR(50)', '转移单号'],
  ['product_code', 'VARCHAR(50)', '产品编码'],
  ['sample_params', 'TEXT', '打样参数(JSON)'],
  ['mass_params', 'TEXT', '量产参数(JSON)'],
  ['sop_file', 'VARCHAR(500)', 'SOP文件路径'],
  ['bom_id', 'BIGINT UNSIGNED', '关联BOM ID'],
  ['bom_version', 'VARCHAR(20)', 'BOM版本'],
  ['process_route', 'VARCHAR(500)', '工艺路线'],
  ['check_standard', 'TEXT', '检验标准'],
  ['special_note', 'TEXT', '特别注意事项'],
  ['sample_confirmer', 'VARCHAR(50)', '打样确认人'],
  ['sample_confirm_date', 'DATE', '打样确认日期'],
  ['eng_confirmer', 'VARCHAR(50)', '工程确认人'],
  ['eng_confirm_date', 'DATE', '工程确认日期'],
  ['prod_confirmer', 'VARCHAR(50)', '生产确认人'],
  ['prod_confirm_date', 'DATE', '生产确认日期'],
  ['quality_confirmer', 'VARCHAR(50)', '品质确认人'],
  ['quality_confirm_date', 'DATE', '品质确认日期'],
  ['create_by', 'BIGINT UNSIGNED', '创建人'],
  ['workorder_id', 'BIGINT UNSIGNED', '量产工单ID'],
  ['workorder_no', 'VARCHAR(50)', '量产工单号'],
  ['conversion_date', 'DATE', '转量产日期'],
  ['approved_by', 'VARCHAR(50)', '审批人'],
];

(async () => {
  const conn = await mysql.createConnection(cfg);
  const table = 'eng_sample_to_mass';
  let added = 0;
  for (const [name, type, comment] of COLUMNS) {
    const [rows] = await conn.query(
      `SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND COLUMN_NAME = ?`,
      [cfg.database, table, name]
    );
    if (rows.length > 0) {
      console.log(`skip (exists): ${name}`);
      continue;
    }
    await conn.query(
      `ALTER TABLE ${table} ADD COLUMN ${name} ${type} COMMENT '${comment}'`
    );
    console.log(`added: ${name} ${type}`);
    added++;
  }

  // 回填 transfer_no（避免存量行该列为空、列表首列空白）
  const [nullRows] = await conn.query(
    `SELECT id FROM ${table} WHERE transfer_no IS NULL OR transfer_no = ''`
  );
  if (nullRows.length > 0) {
    for (const r of nullRows) {
      await conn.query(`UPDATE ${table} SET transfer_no = ? WHERE id = ?`, [
        `STM-${String(r.id).padStart(4, '0')}`,
        r.id,
      ]);
    }
    console.log(`backfilled transfer_no for ${nullRows.length} rows`);
  } else {
    console.log('transfer_no backfill: nothing to do');
  }

  const [final] = await conn.query(
    `SELECT COUNT(*) cnt FROM information_schema.columns WHERE table_schema = ? AND table_name = ?`,
    [cfg.database, table]
  );
  console.log(`\nDONE. added=${added}, total columns now=${final[0].cnt}`);

  // 对齐 supplement-tables 设计：sample_order_id 允许为空（前端表单仅填 sample_order_no）。
  // 否则 INSERT 传 NULL 会因 NOT NULL 约束报 500。
  const [soCols] = await conn.query(
    `SELECT IS_NULLABLE FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND COLUMN_NAME = 'sample_order_id'`,
    [cfg.database, table]
  );
  if (soCols.length > 0 && soCols[0].IS_NULLABLE === 'NO') {
    await conn.query(
      `ALTER TABLE ${table} MODIFY COLUMN sample_order_id BIGINT UNSIGNED NULL COMMENT '样品订单ID'`
    );
    console.log('altered sample_order_id -> nullable');
  }

  await conn.end();
})().catch((e) => {
  console.error('MIGRATION FAILED:', e.message);
  process.exit(1);
});
