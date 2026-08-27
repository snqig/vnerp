// 幂等迁移：补齐销售域缺失列（页面字段映射审计）。
// 这些 GET 路由均使用 SELECT *，补列后字段自动下发；has_mismatch 为派生字段在路由内注入。
const mysql = require('mysql2/promise');
const cfg = { host:'127.0.0.1', port:3306, user:'root', password:'Snqig521223', database:'vnerpdacahng' };

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
  // sal_delivery: 币种/本位币
  await addCol(conn, 'sal_delivery', 'currency', "VARCHAR(10) NOT NULL DEFAULT 'CNY' COMMENT '币种'");
  await addCol(conn, 'sal_delivery', 'base_total_amount', "DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '本位币金额'");
  await addCol(conn, 'sal_delivery', 'base_currency', "VARCHAR(10) NOT NULL DEFAULT 'CNY' COMMENT '本位币'");
  // sal_reconciliation: 币种
  await addCol(conn, 'sal_reconciliation', 'currency', "VARCHAR(10) NOT NULL DEFAULT 'CNY' COMMENT '币种'");
  // sal_return: 退货类型/数量/币种/本位币/验货状态
  await addCol(conn, 'sal_return', 'return_type', "TINYINT NOT NULL DEFAULT 1 COMMENT '退货类型 1质量 2数量 3规格 4其他'");
  await addCol(conn, 'sal_return', 'total_qty', "DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '退货数量'");
  await addCol(conn, 'sal_return', 'currency', "VARCHAR(10) NOT NULL DEFAULT 'CNY' COMMENT '币种'");
  await addCol(conn, 'sal_return', 'base_total_amount', "DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '本位币金额'");
  await addCol(conn, 'sal_return', 'base_currency', "VARCHAR(10) NOT NULL DEFAULT 'CNY' COMMENT '本位币'");
  await addCol(conn, 'sal_return', 'inspection_status', "TINYINT NOT NULL DEFAULT 0 COMMENT '验货状态 0未验 1验货中 2已验'");
  await conn.end();
  console.log('DONE');
  process.exit(0);
})().catch((e) => { console.error('MIGRATION ERROR:', e.message); process.exit(1); });
