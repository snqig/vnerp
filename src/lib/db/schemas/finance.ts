import { bigint, date, datetime, decimal, index, mysqlTable, serial, text, tinyint, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
export const finReceivable = mysqlTable(
  'fin_receivable',
  {
    id: serial('id').primaryKey(),
    receivableNo: varchar('receivable_no', { length: 50 }).notNull(),
    sourceType: tinyint('source_type').default(1),
    sourceNo: varchar('source_no', { length: 50 }),
    customerId: bigint('customer_id', { mode: 'number', unsigned: true }),
    customerName: varchar('customer_name', { length: 100 }),
    salesOrderId: bigint('sales_order_id', { mode: 'number', unsigned: true }),
    salesOrderNo: varchar('sales_order_no', { length: 50 }),
    amount: decimal('amount', { precision: 18, scale: 4 }).default('0.0000'),
    exchangeRate: decimal('exchange_rate', { precision: 18, scale: 4 }).default('1.0000'),
    baseAmount: decimal('base_amount', { precision: 18, scale: 4 }),
    receivedAmount: decimal('received_amount', { precision: 18, scale: 4 }).default('0.0000'),
    pendingAmount: decimal('pending_amount', { precision: 18, scale: 4 }).default('0.0000'),
    balance: decimal('balance', { precision: 18, scale: 4 }).default('0.0000'),
    currency: varchar('currency', { length: 10 }).default('CNY'),
    dueDate: date('due_date'),
    status: tinyint('status').default(1),
    invoiceNo: varchar('invoice_no', { length: 50 }),
    invoiceDate: date('invoice_date'),
    remark: text('remark'),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    deleted: tinyint('deleted').default(0),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    receivableNoIdx: uniqueIndex('uk_receivable_no').on(table.receivableNo),
    customerIdx: index('idx_customer').on(table.customerId),
    sourceIdx: index('idx_source').on(table.sourceNo),
    statusIdx: index('idx_status').on(table.status),
  })
);

export const finPayable = mysqlTable(
  'fin_payable',
  {
    id: serial('id').primaryKey(),
    payableNo: varchar('payable_no', { length: 50 }).notNull(),
    sourceType: tinyint('source_type').default(1),
    sourceNo: varchar('source_no', { length: 50 }),
    supplierId: bigint('supplier_id', { mode: 'number', unsigned: true }),
    amount: decimal('amount', { precision: 18, scale: 4 }).default('0.0000'),
    currency: varchar('currency', { length: 10 }).default('CNY'),
    exchangeRate: decimal('exchange_rate', { precision: 18, scale: 4 }).default('1.0000'),
    baseAmount: decimal('base_amount', { precision: 18, scale: 4 }),
    paidAmount: decimal('paid_amount', { precision: 18, scale: 4 }).default('0.0000'),
    balance: decimal('balance', { precision: 18, scale: 4 }).default('0.0000'),
    dueDate: date('due_date'),
    status: tinyint('status').default(1),
    remark: text('remark'),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    deleted: tinyint('deleted').default(0),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    payableNoIdx: uniqueIndex('uk_payable_no').on(table.payableNo),
    supplierIdx: index('idx_supplier').on(table.supplierId),
    sourceIdx: index('idx_source').on(table.sourceNo),
    statusIdx: index('idx_status').on(table.status),
  })
);

export type FinReceivable = typeof finReceivable.$inferSelect;
export type FinPayable = typeof finPayable.$inferSelect;