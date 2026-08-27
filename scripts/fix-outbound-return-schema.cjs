'use strict';
// 幂等补列：修复 outbound/confirm 与 purchase/return 后端 500（代码/GET 引用了真实表缺失的列）
const mysql = require('mysql2/promise');

const CFG = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
};

async function addCol(conn, table, col, def) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS c FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
    [CFG.database, table, col]
  );
  if (rows[0].c === 0) {
    await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${def}`);
    console.log(`+ ADDED  ${table}.${col}`);
  } else {
    console.log(`= EXISTS ${table}.${col}`);
  }
}

async function main() {
  const conn = await mysql.createConnection(CFG);
  try {
    // inv_outbound_order：confirm 路由 UPDATE/SELECT 引用了以下列
    await addCol(conn, 'inv_outbound_order', 'auditor_id', 'bigint unsigned DEFAULT NULL COMMENT \'审核人ID\'');
    await addCol(conn, 'inv_outbound_order', 'audit_remark', 'varchar(512) DEFAULT NULL COMMENT \'审核备注\'');
    await addCol(conn, 'inv_outbound_order', 'customer_id', 'bigint unsigned DEFAULT NULL COMMENT \'客户ID\'');
    await addCol(conn, 'inv_outbound_order', 'customer_name', 'varchar(128) DEFAULT NULL COMMENT \'客户名称\'');
    await addCol(conn, 'inv_outbound_order', 'sales_order_no', 'varchar(50) DEFAULT NULL COMMENT \'销售单号\'');

    // pur_purchase_return：createReturn 与 GET 引用了以下列
    await addCol(conn, 'pur_purchase_return', 'currency', 'varchar(10) DEFAULT \'CNY\' COMMENT \'币种\'');
    await addCol(conn, 'pur_purchase_return', 'exchange_rate', 'decimal(10,4) DEFAULT 1.0000 COMMENT \'汇率\'');
    await addCol(conn, 'pur_purchase_return', 'base_total_amount', 'decimal(18,4) DEFAULT 0.0000 COMMENT \'本位币金额\'');
    await addCol(conn, 'pur_purchase_return', 'base_currency', 'varchar(10) DEFAULT \'CNY\' COMMENT \'本位币\'');

    // pur_purchase_return_line：save() 引用了 base_unit_price / base_amount
    await addCol(conn, 'pur_purchase_return_line', 'base_unit_price', 'decimal(18,4) DEFAULT 0.0000 COMMENT \'本位币单价\'');
    await addCol(conn, 'pur_purchase_return_line', 'base_amount', 'decimal(18,4) DEFAULT 0.0000 COMMENT \'本位币金额\'');

    // fin_receivable：outbound/confirm 自动生成应收单引用了 customer_name / source_id
    await addCol(conn, 'fin_receivable', 'customer_name', 'varchar(128) DEFAULT NULL COMMENT \'客户名称\'');
    await addCol(conn, 'fin_receivable', 'source_id', 'bigint DEFAULT NULL COMMENT \'来源单ID\'');

    console.log('DONE');
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
