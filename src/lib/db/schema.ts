/**
 * Drizzle ORM Schema 映射（精简版）
 *
 * 权威 schema 来源：database/vnerpdacahng_schema.sql
 * 本文件仅包含被 Drizzle ORM 构建器实际消费的表定义。
 * 新增 ORM 消费表时，从 SQL DDL 对应翻译并在此追加。
 *
 * 历史背景：原文件包含 41 张扁平命名表（customers/work_orders 等），
 * 与 SQL 文件的模块前缀命名（crm_customer/prd_work_order）零交集，
 * 且仅 2 张表被 DrizzleInboundOrderRepository 消费，其余 39 张为孤儿代码。
 * 本次 P0-2 统一后，schema.ts 仅保留 ORM 活跃消费的表。
 */

import {
  mysqlTable,
  varchar,
  datetime,
  decimal,
  int,
  boolean,
  serial,
  index,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

// ==================== 仓库入库（ORM 消费） ====================

// 入库单主表
export const invInboundOrders = mysqlTable('inv_inbound_order', {
  id: serial('id').primaryKey(),
  orderNo: varchar('order_no', { length: 30 }).notNull(),
  orderType: varchar('order_type', { length: 20 }).default('purchase'),
  warehouseId: int('warehouse_id').notNull(),
  supplierName: varchar('supplier_name', { length: 100 }),
  inboundDate: datetime('inbound_date'),
  totalQuantity: decimal('total_quantity', { precision: 15, scale: 3 }).default('0'),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }),
  status: varchar('status', { length: 20 }).default('pending'),
  qcStatus: varchar('qc_status', { length: 20 }).default('pending'),
  remark: varchar('remark', { length: 500 }),
  deleted: boolean('deleted').default(false),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  orderNoIdx: index('idx_order_no').on(table.orderNo),
  statusIdx: index('idx_status').on(table.status),
  warehouseIdx: index('idx_warehouse').on(table.warehouseId),
  inboundDateIdx: index('idx_inbound_date').on(table.inboundDate),
}));

// 入库单明细
export const invInboundItems = mysqlTable('inv_inbound_item', {
  id: serial('id').primaryKey(),
  orderId: int('order_id').notNull(),
  materialId: int('material_id'),
  materialName: varchar('material_name', { length: 200 }),
  materialSpec: varchar('material_spec', { length: 200 }),
  batchNo: varchar('batch_no', { length: 50 }),
  quantity: decimal('quantity', { precision: 15, scale: 3 }),
  unit: varchar('unit', { length: 20 }),
  unitPrice: decimal('unit_price', { precision: 15, scale: 4 }),
  totalPrice: decimal('total_price', { precision: 15, scale: 4 }),
  warehouseLocation: varchar('warehouse_location', { length: 50 }),
  produceDate: datetime('produce_date'),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  orderIdx: index('idx_order').on(table.orderId),
  materialIdx: index('idx_material').on(table.materialId),
  batchIdx: index('idx_batch').on(table.batchNo),
}));

// 类型导出
export type InvInboundOrder = typeof invInboundOrders.$inferSelect;
export type InvInboundItem = typeof invInboundItems.$inferSelect;
