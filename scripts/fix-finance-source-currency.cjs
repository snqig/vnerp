// 幂等迁移：为 fin_payable / fin_receivable 补充 source_currency（及应收的 source_amount）列。
// 这两个列表页的「来源币种」徽标依赖 source_currency / source_amount 字段，
// 但真实表原先没有这些列（CNY 本位币系统，默认 'CNY' / 0）。GET 路由使用 SELECT *，补列后字段自动下发。
const mysql = require('mysql2/promise');
const cfg = { host:'127.0.0.1', port:3306, user:'root', password:'Snqig521223', database:'vnerpdacahng', multipleStatements:true };

async function colExists(conn, table, col) {
  const [r] = await conn.query(
    `SELECT 1 as ok FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
    [cfg.database, table, col]
  );
  return r.length > 0;
}
async function addCol(conn, table, col, def) {
  if (await colExists(conn, table, col)) { console.log(`[skip] ${table}.${col} 已存在`); return; }
  await conn.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
  console.log(`[add]  ${table}.${col} (${def})`);
}

(async () => {
  const conn = await mysql.createConnection(cfg);
  await addCol(conn, 'fin_payable', 'source_currency', "VARCHAR(10) NOT NULL DEFAULT 'CNY' COMMENT '来源币种'");
  await addCol(conn, 'fin_receivable', 'source_currency', "VARCHAR(10) NOT NULL DEFAULT 'CNY' COMMENT '来源币种'");
  await addCol(conn, 'fin_receivable', 'source_amount', "DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '来源金额'");
  await conn.end();
  console.log('DONE');
  process.exit(0);
})().catch((e) => { console.error('MIGRATION ERROR:', e.message); process.exit(1); });
