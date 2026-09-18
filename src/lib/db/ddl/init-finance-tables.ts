/**
 * src/app/api/init/finance-tables/route.ts 使用的 SQL 常量。
 *
 * 由 2026-09-18 的 P0 治理从 messages/*.json 的 i18n 合成键还原而来——
 * 这些值原先被 i18n codemod 当成「硬编码中文」抽成 k_xxxxxxxx 键，
 * 导致「改翻译文件 = 改实际执行的 DDL」。现回归为代码常量，禁止再写入 i18n。
 */

/** CREATE … */
export const CREATE_TABLE_FINANCE_RECEIPT = `CREATE TABLE IF NOT EXISTS finance_receipt (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      receipt_no VARCHAR(50) NOT NULL COMMENT '收款单号',
      receivable_id BIGINT UNSIGNED DEFAULT NULL COMMENT '应收单ID',
      customer_id BIGINT UNSIGNED NOT NULL COMMENT '客户ID',
      customer_name VARCHAR(100) NOT NULL COMMENT '客户名称',
      receipt_amount DECIMAL(15,2) NOT NULL COMMENT '收款金额',
      receipt_date DATE NOT NULL COMMENT '收款日期',
      payment_method VARCHAR(20) DEFAULT 'bank' COMMENT '付款方式: bank-银行转账, cash-现金, check-支票, other-其他',
      bank_name VARCHAR(100) DEFAULT NULL COMMENT '开户行',
      bank_account VARCHAR(50) DEFAULT NULL COMMENT '银行账号',
      invoice_no VARCHAR(50) DEFAULT NULL COMMENT '发票号',
      status VARCHAR(20) DEFAULT 'confirmed' COMMENT '状态: pending-待确认, confirmed-已确认, cancelled-已取消',
      remark TEXT COMMENT '备注',
      create_by BIGINT UNSIGNED DEFAULT NULL,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_by BIGINT UNSIGNED DEFAULT NULL,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT(1) DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_receipt_no (receipt_no),
      KEY idx_receivable (receivable_id),
      KEY idx_customer (customer_id),
      KEY idx_receipt_date (receipt_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='收款记录表'`;

/** CREATE … */
export const CREATE_TABLE_FIN_RECEIVABLE = `CREATE TABLE IF NOT EXISTS fin_receivable (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      receivable_no VARCHAR(50) NOT NULL COMMENT '应收单号',
      source_type TINYINT DEFAULT 1 COMMENT '来源类型',
      source_no VARCHAR(50) COMMENT '来源单号',
      customer_id BIGINT UNSIGNED COMMENT '客户ID',
      customer_name VARCHAR(100) COMMENT '客户名称',
      sales_order_id BIGINT UNSIGNED COMMENT '销售订单ID',
      sales_order_no VARCHAR(50) COMMENT '销售订单号',
      amount DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '应收金额',
      received_amount DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '已收金额',
      pending_amount DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '待收金额',
      balance DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '余额',
      currency VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
      due_date DATE COMMENT '到期日期',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-待收款 2-部分收款 3-已完成 4-逾期',
      invoice_no VARCHAR(50) COMMENT '发票号',
      invoice_date DATE COMMENT '发票日期',
      remark TEXT COMMENT '备注',
      create_by BIGINT UNSIGNED,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_by BIGINT UNSIGNED,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT(1) DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_receivable_no (receivable_no),
      KEY idx_customer (customer_id),
      KEY idx_source (source_no),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='应收款表'`;
