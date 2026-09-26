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
    approvedAt: datetime('approved_at'), // 审核时间
    approvedBy: bigint('approved_by', { mode: 'number', unsigned: true }), // 审核人ID
    cancelledAt: datetime('cancelled_at'), // 作废时间
    cancelledBy: bigint('cancelled_by', { mode: 'number', unsigned: true }), // 作废人ID
    cancelledReason: varchar('cancelled_reason', { length: 500 }), // 作废原因
    completedQty: decimal('completed_qty', { precision: 18, scale: 3 }).default('0.000'), // 已完成数量
    legacyMaterialId: bigint('legacy_material_id', { mode: 'number', unsigned: true }),
    orderType: tinyint('order_type').default(0), // 工单类型: 0-正常 1-打样工单 2-返工
    plannedQty: decimal('planned_qty', { precision: 18, scale: 3 }).default('0.000'), // 计划数量
    processCardId: bigint('process_card_id', { mode: 'number', unsigned: true }), // process_card_id
    processId: int('process_id'), // 工艺路线ID
    processName: varchar('process_name', { length: 128 }), // 工艺路线名称
    productCode: varchar('product_code', { length: 64 }), // 产品编码
    productId: int('product_id').default(0), // 产品ID(mdm_product.id)
    salesOrderId: bigint('sales_order_id', { mode: 'number', unsigned: true }), // sales_order_id
    standardCardId: bigint('standard_card_id', { mode: 'number', unsigned: true }), // standard_card_id
    totalLaborCost: decimal('total_labor_cost', { precision: 18, scale: 4 }).default('0.0000'), // 人工成本合计
    totalOverheadCost: decimal('total_overhead_cost', { precision: 18, scale: 4 }).default('0.0000'), // 制造费用
    totalToolCost: decimal('total_tool_cost', { precision: 18, scale: 4 }).default('0.0000'), // 工装分摊成本
    unitCost: decimal('unit_cost', { precision: 18, scale: 4 }).default('0.0000'), // 单位成本
    warehouseId: int('warehouse_id').default(1), // 仓库ID
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
    remark: text('remark'), // 备注
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