import { bigint, datetime, decimal, index, int, mysqlTable, text, tinyint, varchar } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const qrcodeRecord = mysqlTable('qrcode_record', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  qrContent: varchar('qr_content', { length: 64 }).notNull(),
  parentQrId: bigint('parent_qr_id', { mode: 'number', unsigned: true }),
  splitFlag: tinyint('split_flag').default(0),
  splitIndex: int('split_index').default(0),
  sourceType: tinyint('source_type').notNull(),
  batchNo: varchar('batch_no', { length: 50 }),
  quantity: decimal('quantity', { precision: 18, scale: 4 }).default('0.0000'),
  materialId: bigint('material_id', { mode: 'number', unsigned: true }),
  materialName: varchar('material_name', { length: 100 }),
  status: tinyint('status').default(1),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  deleted: tinyint('deleted').default(0),
}, (table) => ({
  qrContentIdx: index('idx_qr_content').on(table.qrContent),
  batchNoIdx: index('idx_batch_no').on(table.batchNo),
  parentQrIdx: index('idx_parent_qr').on(table.parentQrId),
  sourceTypeIdx: index('idx_source_type').on(table.sourceType),
}));

export const printLog = mysqlTable('print_log', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  qrId: bigint('qr_id', { mode: 'number', unsigned: true }).notNull(),
  templateId: bigint('template_id', { mode: 'number', unsigned: true }),
  printTime: datetime('print_time').default(sql`CURRENT_TIMESTAMP`),
  operator: varchar('operator', { length: 50 }),
  paperType: varchar('paper_type', { length: 20 }).default('thermal'),
  printCount: int('print_count').default(1),
});

export const labelTemplate = mysqlTable('label_template', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  scenario: varchar('scenario', { length: 30 }).notNull(),
  htmlTemplate: text('html_template').notNull(),
  widthMm: int('width_mm').default(60),
  heightMm: int('height_mm').default(40),
  qrSizeMm: int('qr_size_mm').default(20),
  status: tinyint('status').default(1),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
});

export type QrcodeRecord = typeof qrcodeRecord.$inferSelect;
export type PrintLog = typeof printLog.$inferSelect;
export type LabelTemplate = typeof labelTemplate.$inferSelect;
