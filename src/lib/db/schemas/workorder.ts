import { bigint, date, datetime, decimal, index, int, mysqlTable, serial, text, tinyint, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
export const prodWorkOrder = mysqlTable(
  'prod_work_order',
  {
    id: serial('id').primaryKey(),
    workOrderNo: varchar('work_order_no', { length: 50 }).notNull(),
    orderId: bigint('order_id', { mode: 'number', unsigned: true }),
    orderNo: varchar('order_no', { length: 50 }),
    bomId: bigint('bom_id', { mode: 'number', unsigned: true }),
    customerName: varchar('customer_name', { length: 200 }),
    productName: varchar('product_name', { length: 200 }),
    quantity: decimal('quantity', { precision: 18, scale: 4 }).default('0.00'),
    unit: varchar('unit', { length: 20 }),
    status: varchar('status', { length: 20 }).default('pending'),
    priority: varchar('priority', { length: 20 }).default('normal'),
    planStartDate: date('plan_start_date'),
    planEndDate: date('plan_end_date'),
    actualStartDate: date('actual_start_date'),
    actualEndDate: date('actual_end_date'),
    remark: text('remark'),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
    pickedQty: decimal('picked_qty', { precision: 18, scale: 4 }).default('0.00'),
    finishedQty: decimal('finished_qty', { precision: 18, scale: 4 }).default('0.00'),
    returnedQty: decimal('returned_qty', { precision: 18, scale: 4 }).default('0.00'),
    totalMaterialCost: decimal('total_material_cost', { precision: 18, scale: 4 }).default('0.00'),
  },
  (table) => ({
    workOrderNoIdx: uniqueIndex('uk_prod_work_order_no').on(table.workOrderNo),
    orderNoIdx: index('idx_prod_order_no').on(table.orderNo),
  })
);

export const prodWorkOrderItem = mysqlTable(
  'prod_work_order_item',
  {
    id: serial('id').primaryKey(),
    workOrderId: bigint('work_order_id', { mode: 'number', unsigned: true }).notNull(),
    lineNo: int('line_no').notNull().default(1),
    materialId: bigint('material_id', { mode: 'number', unsigned: true }),
    materialName: varchar('material_name', { length: 200 }),
    quantity: decimal('quantity', { precision: 18, scale: 4 }).notNull(),
    unit: varchar('unit', { length: 20 }).default('pcs'),
    unitPrice: decimal('unit_price', { precision: 18, scale: 4 }).default('0.0000'),
    totalPrice: decimal('total_price', { precision: 18, scale: 4 }).default('0.0000'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workOrderIdIdx: index('idx_prod_wo_item_work_order').on(table.workOrderId),
  })
);

export const prodWorkOrderMaterialReq = mysqlTable(
  'prod_work_order_material_req',
  {
    id: serial('id').primaryKey(),
    workOrderId: bigint('work_order_id', { mode: 'number', unsigned: true }).notNull(),
    bomLineId: bigint('bom_line_id', { mode: 'number', unsigned: true }),
    materialId: bigint('material_id', { mode: 'number', unsigned: true }),
    materialName: varchar('material_name', { length: 200 }),
    requiredQty: decimal('required_qty', { precision: 18, scale: 4 }).notNull(),
    unit: varchar('unit', { length: 20 }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workOrderIdIdx: index('idx_prod_wo_req_work_order').on(table.workOrderId),
  })
);

export type ProdWorkOrder = typeof prodWorkOrder.$inferSelect;
export type ProdWorkOrderItem = typeof prodWorkOrderItem.$inferSelect;
export type ProdWorkOrderMaterialReq = typeof prodWorkOrderMaterialReq.$inferSelect;