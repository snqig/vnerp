import { bigint, datetime, json, mysqlTable, tinyint, varchar } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const reportUserConfig = mysqlTable('report_user_config', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull(),
  reportKey: varchar('report_key', { length: 50 }).notNull(),
  selectedFields: json('selected_fields'),
  selectedCategories: json('selected_categories'),
  dateRange: json('date_range'),
  viewMode: varchar('view_mode', { length: 20 }).default('all'),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
});

export type ReportUserConfig = typeof reportUserConfig.$inferSelect;
