import { bigint, date, datetime, decimal, index, int, mysqlTable, serial, text, tinyint, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
export const salQuote = mysqlTable(
  'sal_quote',
  {
    id: serial('id').primaryKey(),
    quoteNo: varchar('quote_no', { length: 50 }).notNull(),
    quoteDate: date('quote_date').notNull(),
    customerId: bigint('customer_id', { mode: 'number', unsigned: true }),
    customerName: varchar('customer_name', { length: 100 }),
    sampleCardId: bigint('sample_card_id', { mode: 'number', unsigned: true }),
    sampleNo: varchar('sample_no', { length: 50 }),
    productName: varchar('product_name', { length: 200 }),
    quantity: int('quantity').notNull().default(1),
    unit: varchar('unit', { length: 20 }).default('pcs'),
    materialCost: decimal('material_cost', { precision: 18, scale: 4 }).default('0.0000'),
    laborCost: decimal('labor_cost', { precision: 18, scale: 4 }).default('0.0000'),
    toolCost: decimal('tool_cost', { precision: 18, scale: 4 }).default('0.0000'),
    totalCost: decimal('total_cost', { precision: 18, scale: 4 }).default('0.0000'),
    markupRate: decimal('markup_rate', { precision: 5, scale: 2 }).default('30.00'),
    quotedPrice: decimal('quoted_price', { precision: 18, scale: 4 }).default('0.0000'),
    currency: varchar('currency', { length: 10 }).default('CNY'),
    status: tinyint('status').default(1),
    validUntil: date('valid_until'),
    remark: text('remark'),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    quoteNoIdx: uniqueIndex('uk_sal_quote_no').on(table.quoteNo),
    customerIdx: index('idx_sal_quote_customer').on(table.customerId),
    sampleCardIdx: index('idx_sal_quote_sample_card').on(table.sampleCardId),
  })
);

export const salQuoteItem = mysqlTable(
  'sal_quote_item',
  {
    id: serial('id').primaryKey(),
    quoteId: bigint('quote_id', { mode: 'number', unsigned: true }).notNull(),
    lineNo: int('line_no').notNull().default(1),
    itemName: varchar('item_name', { length: 200 }).notNull(),
    quantity: decimal('quantity', { precision: 18, scale: 4 }).notNull().default('1.0000'),
    unit: varchar('unit', { length: 20 }).default('pcs'),
    unitCost: decimal('unit_cost', { precision: 18, scale: 4 }).default('0.0000'),
    unitPrice: decimal('unit_price', { precision: 18, scale: 4 }).default('0.0000'),
    totalPrice: decimal('total_price', { precision: 18, scale: 4 }).default('0.0000'),
    remark: varchar('remark', { length: 255 }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    quoteIdIdx: index('idx_sal_quote_item_quote').on(table.quoteId),
  })
);

export type SalQuote = typeof salQuote.$inferSelect;
export type SalQuoteItem = typeof salQuoteItem.$inferSelect;