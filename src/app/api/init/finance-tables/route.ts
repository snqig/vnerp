import { NextRequest } from 'next/server';
import { execute } from '@/lib/db';

export async function POST(_request: NextRequest) {
  const results: string[] = [];

  try {
    await execute(`CREATE TABLE IF NOT EXISTS finance_receivable (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      receivable_no VARCHAR(50) NOT NULL COMMENT '应收单号',
      customer_id BIGINT UNSIGNED NOT NULL COMMENT '客户ID',
      customer_name VARCHAR(100) NOT NULL COMMENT '客户名称',
      sales_order_id BIGINT UNSIGNED DEFAULT NULL COMMENT '销售订单ID',
      sales_order_no VARCHAR(50) DEFAULT NULL COMMENT '销售订单号',
      amount DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT '应收金额',
      received_amount DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT '已收金额',
      pending_amount DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT '待收金额',
      currency VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
      due_date DATE DEFAULT NULL COMMENT '到期日期',
      status VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending-待收款, partial-部分收款, completed-已完成, overdue-逾期',
      invoice_no VARCHAR(50) DEFAULT NULL COMMENT '发票号',
      invoice_date DATE DEFAULT NULL COMMENT '发票日期',
      remark TEXT COMMENT '备注',
      create_by BIGINT UNSIGNED DEFAULT NULL,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_by BIGINT UNSIGNED DEFAULT NULL,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT(1) DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_receivable_no (receivable_no),
      KEY idx_customer (customer_id),
      KEY idx_due_date (due_date),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='应收款表'`);
    results.push('finance_receivable');

    await execute(`CREATE TABLE IF NOT EXISTS finance_receipt (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='收款记录表'`);
    results.push('finance_receipt');

    return Response.json({
      success: true,
      message: '财务表创建成功',
      tables: results,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: (error as Error).message,
        tables: results,
      },
      { status: 500 }
    );
  }
}
