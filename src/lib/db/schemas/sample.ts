import {
  bigint,
  date,
  datetime,
  decimal,
  index,
  int,
  mysqlTable,
  text,
  tinyint,
  uniqueIndex,
  varchar,
  foreignKey,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
export const dcprintSampleProcessCard = mysqlTable(
  'dcprint_sample_process_card',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    sampleNo: varchar('sample_no', { length: 50 }).notNull(),
    sampleName: varchar('sample_name', { length: 100 }).notNull(),
    customerId: bigint('customer_id', { mode: 'number', unsigned: true }),
    customerName: varchar('customer_name', { length: 100 }),
    productId: bigint('product_id', { mode: 'number', unsigned: true }),
    productName: varchar('product_name', { length: 200 }),
    versionNo: varchar('version_no', { length: 20 }).notNull().default('V1.0'),
    status: tinyint('status').notNull().default(1),
    substrateMaterialId: bigint('substrate_material_id', { mode: 'number', unsigned: true }),
    substrateMaterialName: varchar('substrate_material_name', { length: 100 }),
    spec: varchar('spec', { length: 255 }),
    printColor: varchar('print_color', { length: 100 }),
    inkColorId: bigint('ink_color_id', { mode: 'number', unsigned: true }),
    screenPlateId: bigint('screen_plate_id', { mode: 'number', unsigned: true }),
    dieToolId: bigint('die_tool_id', { mode: 'number', unsigned: true }),
    materialLossRate: decimal('material_loss_rate', { precision: 5, scale: 2 }).default('5.00'),
    estimatedHour: decimal('estimated_hour', { precision: 6, scale: 2 }),
    sampleWorkOrderId: bigint('sample_work_order_id', { mode: 'number', unsigned: true }),
    sampleWorkOrderNo: varchar('sample_work_order_no', { length: 50 }),
    quoteId: bigint('quote_id', { mode: 'number', unsigned: true }),
    formalWorkOrderId: bigint('formal_work_order_id', { mode: 'number', unsigned: true }),
    sourceVersionId: bigint('source_version_id', { mode: 'number', unsigned: true }),
    confirmBy: bigint('confirm_by', { mode: 'number', unsigned: true }),
    confirmTime: datetime('confirm_time'),
    totalMaterialCost: decimal('total_material_cost', { precision: 12, scale: 4 }).default(
      '0.0000'
    ),
    totalLaborCost: decimal('total_labor_cost', { precision: 12, scale: 4 }).default('0.0000'),
    totalToolCost: decimal('total_tool_cost', { precision: 12, scale: 4 }).default('0.0000'),
    totalCost: decimal('total_cost', { precision: 12, scale: 4 }).default('0.0000'),
    remark: text('remark'),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').notNull().default(0),
    diagramUrl: varchar('diagram_url', { length: 500 }), // 工艺图示URL
  },
  (table) => ({
    sampleNoIdx: uniqueIndex('uk_sample_no').on(table.sampleNo),
    customerIdx: index('idx_customer').on(table.customerId),
    statusIdx: index('idx_status').on(table.status),
    inkColorIdx: index('idx_ink_color').on(table.inkColorId),
    dieToolIdx: index('idx_die_tool').on(table.dieToolId),
    screenPlateIdx: index('idx_screen_plate').on(table.screenPlateId),
    sourceVersionIdx: index('idx_source_version').on(table.sourceVersionId),
  })
);

export const dcprintSampleProcessItem = mysqlTable(
  'dcprint_sample_process_item',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    cardId: bigint('card_id', { mode: 'number', unsigned: true }).notNull(),
    itemType: tinyint('item_type').notNull().default(1),
    materialId: bigint('material_id', { mode: 'number', unsigned: true }),
    materialCode: varchar('material_code', { length: 50 }).notNull(),
    materialName: varchar('material_name', { length: 100 }).notNull(),
    specification: varchar('specification', { length: 255 }),
    unitDosage: decimal('unit_dosage', { precision: 10, scale: 4 }).notNull(),
    unit: varchar('unit', { length: 20 }),
    unitCost: decimal('unit_cost', { precision: 12, scale: 4 }).default('0.0000'),
    lineCost: decimal('line_cost', { precision: 12, scale: 4 }).default('0.0000'),
    remark: varchar('remark', { length: 255 }),
    sort: int('sort').notNull().default(0),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    cardIdx: index('idx_card_id').on(table.cardId),
    materialIdx: index('idx_material_id').on(table.materialId),

    fk_dcprintSampleProcessCard_cardId: foreignKey({
      name: 'fk_sample_item_card',
      columns: [table.cardId],
      foreignColumns: [dcprintSampleProcessCard.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
  })
);

export const dcprintSampleProcessStep = mysqlTable(
  'dcprint_sample_process_step',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    cardId: bigint('card_id', { mode: 'number', unsigned: true }).notNull(),
    processId: bigint('process_id', { mode: 'number', unsigned: true }),
    processName: varchar('process_name', { length: 100 }).notNull(),
    workHour: decimal('work_hour', { precision: 6, scale: 2 }).notNull(),
    hourlyRate: decimal('hourly_rate', { precision: 10, scale: 2 }).default('0.00'),
    lineCost: decimal('line_cost', { precision: 12, scale: 4 }).default('0.0000'),
    processParam: text('process_param'),
    sort: int('sort').notNull().default(0),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    cardIdx: index('idx_card_id').on(table.cardId),
    processIdx: index('idx_process_id').on(table.processId),
      fk_dcprintSampleProcessCard_cardId: foreignKey({
      name: 'fk_sample_step_card',
      columns: [table.cardId],
      foreignColumns: [dcprintSampleProcessCard.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
  })
);

export const sampleOrder = mysqlTable(
  'sal_sample_order',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    orderDate: date('order_date').notNull(),
    customerId: bigint('customer_id', { mode: 'number', unsigned: true }),
    customerName: varchar('customer_name', { length: 200 }),
    productName: varchar('product_name', { length: 200 }),
    sizeSpec: varchar('size_spec', { length: 100 }),
    quantity: int('quantity'),
    processCardId: bigint('process_card_id', { mode: 'number', unsigned: true }),
    workOrderId: bigint('work_order_id', { mode: 'number', unsigned: true }),
    salesOrderId: bigint('sales_order_id', { mode: 'number', unsigned: true }),
    remark: text('remark'),
    status: tinyint('status').default(0),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
    actualDeliveryDate: date('actual_delivery_date'), // 实际交付日期
    convertedAt: datetime('converted_at'), // 转大货时间
    convertedBy: bigint('converted_by', { mode: 'number', unsigned: true }), // 转大货操作人
    customerRequireDate: date('customer_require_date'), // 客户需求日期
    deliveryDate: date('delivery_date'), // 交付日期
    deliveryStatus: varchar('delivery_status', { length: 20 }), // 交付状态
    feeCharged: tinyint('fee_charged').default(0), // 是否收取打样费: 0-否 1-是
    feeDeducted: tinyint('fee_deducted').default(0), // 打样费是否已抵扣: 0-否 1-是
    feeDeductible: tinyint('fee_deductible').default(0), // 打样费是否可抵扣大货: 0-否 1-是
    materialNo: varchar('material_no', { length: 50 }), // 物料编号
    materialSpec: varchar('material_spec', { length: 200 }), // 材料规格
    notifyDate: date('notify_date'), // 通知日期
    orderNo: varchar('order_no', { length: 50 }), // 打样订单号
    parentVersionId: bigint('parent_version_id', { mode: 'number', unsigned: true }), // 父版本打样单ID
    sampleFee: decimal('sample_fee', { precision: 18, scale: 4 }).default('0.0000'), // 打样费用
    sampleVersion: int('sample_version').default(1), // 打样版本号(支持多轮改样)
    specification: varchar('specification', { length: 200 }), // 规格型号
    version: varchar('version', { length: 20 }), // 版本
  },
  (table) => ({
    customerIdx: index('idx_customer').on(table.customerName),
    orderDateIdx: index('idx_order_date').on(table.orderDate),
    statusIdx: index('idx_status').on(table.status),
    processCardIdx: index('idx_process_card').on(table.processCardId),
    workOrderIdx: index('idx_work_order').on(table.workOrderId),
  })
);





export type DcprintSampleProcessCard = typeof dcprintSampleProcessCard.$inferSelect;
export type DcprintSampleProcessItem = typeof dcprintSampleProcessItem.$inferSelect;
export type DcprintSampleProcessStep = typeof dcprintSampleProcessStep.$inferSelect;
export type SampleOrder = typeof sampleOrder.$inferSelect;
