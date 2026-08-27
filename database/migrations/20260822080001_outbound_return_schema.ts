/**
 * 081 修复 outbound/confirm 与 purchase/return 后端 500
 * 代码/GET 引用了真实表缺失的列，导致整条链路 500。幂等（information_schema 探测）。
 */
import { Connection } from 'mysql2/promise';

const COLS: Array<[string, string, string]> = [
  ['inv_outbound_order', 'auditor_id', 'BIGINT UNSIGNED DEFAULT NULL COMMENT \'审核人ID\''],
  ['inv_outbound_order', 'audit_remark', "VARCHAR(512) DEFAULT NULL COMMENT '审核备注'"],
  ['inv_outbound_order', 'customer_id', 'BIGINT UNSIGNED DEFAULT NULL COMMENT \'客户ID\''],
  ['inv_outbound_order', 'customer_name', "VARCHAR(128) DEFAULT NULL COMMENT '客户名称'"],
  ['inv_outbound_order', 'sales_order_no', "VARCHAR(50) DEFAULT NULL COMMENT '销售单号'"],
  ['pur_purchase_return', 'currency', "VARCHAR(10) DEFAULT 'CNY' COMMENT '币种'"],
  ['pur_purchase_return', 'exchange_rate', "DECIMAL(10,4) DEFAULT 1.0000 COMMENT '汇率'"],
  ['pur_purchase_return', 'base_total_amount', "DECIMAL(18,4) DEFAULT 0.0000 COMMENT '本位币金额'"],
  ['pur_purchase_return', 'base_currency', "VARCHAR(10) DEFAULT 'CNY' COMMENT '本位币'"],
  ['pur_purchase_return_line', 'base_unit_price', "DECIMAL(18,4) DEFAULT 0.0000 COMMENT '本位币单价'"],
  ['pur_purchase_return_line', 'base_amount', "DECIMAL(18,4) DEFAULT 0.0000 COMMENT '本位币金额'"],
  ['fin_receivable', 'customer_name', "VARCHAR(128) DEFAULT NULL COMMENT '客户名称'"],
  ['fin_receivable', 'source_id', 'BIGINT DEFAULT NULL COMMENT \'来源单ID\''],
];

export async function up(conn: Connection): Promise<void> {
  for (const [table, col, def] of COLS) {
    const [rows] = await conn.query(
      `SELECT COUNT(*) c FROM information_schema.columns
       WHERE table_schema = 'vnerpdacahng' AND table_name = ? AND column_name = ?`,
      [table, col]
    );
    if ((rows as any[])[0].c === 0) {
      await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${def}`);
      console.log(`+ added ${table}.${col}`);
    } else {
      console.log(`= exists ${table}.${col}`);
    }
  }
}

export async function down(conn: Connection): Promise<void> {
  for (const [table, col] of COLS) {
    const [rows] = await conn.query(
      `SELECT COUNT(*) c FROM information_schema.columns
       WHERE table_schema = 'vnerpdacahng' AND table_name = ? AND column_name = ?`,
      [table, col]
    );
    if ((rows as any[])[0].c > 0) {
      await conn.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${col}\``);
      console.log(`- dropped ${table}.${col}`);
    }
  }
}
