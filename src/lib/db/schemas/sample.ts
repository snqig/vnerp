import { bigint, date, datetime, decimal, index, int, mysqlTable, text, tinyint, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
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
  })
);

export const sampleOrder = mysqlTable(
  'sal_sample_order',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    sampleNo: varchar('sample_no', { length: 50 }).notNull(),
    orderMonth: int('order_month'),
    orderDate: date('order_date').notNull(),
    sampleType: varchar('sample_type', { length: 50 }),
    customerId: bigint('customer_id', { mode: 'number', unsigned: true }),
    customerName: varchar('customer_name', { length: 200 }),
    printMethod: varchar('print_method', { length: 100 }),
    colorSequence: varchar('color_sequence', { length: 50 }),
    productName: varchar('product_name', { length: 200 }),
    materialCode: varchar('material_code', { length: 100 }),
    sizeSpec: varchar('size_spec', { length: 100 }),
    materialDesc: text('material_desc'),
    sampleOrderNo: varchar('sample_order_no', { length: 100 }),
    requiredDate: date('required_date'),
    progressStatus: varchar('progress_status', { length: 100 }),
    isConfirmed: tinyint('is_confirmed').default(0),
    isUrgent: tinyint('is_urgent').default(0),
    isProduceTogether: tinyint('is_produce_together').default(0),
    quantity: int('quantity'),
    progressDetail: varchar('progress_detail', { length: 200 }),
    sampleCount: int('sample_count').default(1),
    sampleReason: varchar('sample_reason', { length: 200 }),
    orderTracker: varchar('order_tracker', { length: 100 }),
    providedMaterial: varchar('provided_material', { length: 100 }),
    receiveTime: datetime('receive_time'),
    mylarInfo: varchar('mylar_info', { length: 200 }),
    sampleStock: varchar('sample_stock', { length: 200 }),
    customerConfirm: varchar('customer_confirm', { length: 200 }),
    processCardId: bigint('process_card_id', { mode: 'number', unsigned: true }),
    workOrderId: bigint('work_order_id', { mode: 'number', unsigned: true }),
    salesOrderId: bigint('sales_order_id', { mode: 'number', unsigned: true }),
    remark: text('remark'),
    status: tinyint('status').default(0),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    sampleNoIdx: index('idx_sample_no').on(table.sampleNo),
    customerIdx: index('idx_customer').on(table.customerName),
    orderDateIdx: index('idx_order_date').on(table.orderDate),
    statusIdx: index('idx_status').on(table.status),
    sampleTypeIdx: index('idx_sample_type').on(table.sampleType),
    processCardIdx: index('idx_process_card').on(table.processCardId),
    workOrderIdx: index('idx_work_order').on(table.workOrderId),
  })
);

export const salSampleFeedback = mysqlTable(
  'sal_sample_feedback',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    sampleOrderId: bigint('sample_order_id', { mode: 'number', unsigned: true }).notNull(),
    round: int('round').notNull().default(1),
    feedbackContent: text('feedback_content'),
    modificationRequirements: text('modification_requirements'),
    confirmationStatus: varchar('confirmation_status', { length: 20 }).default('pending'),
    feedbackBy: varchar('feedback_by', { length: 100 }),
    feedbackTime: datetime('feedback_time'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    sampleOrderIdx: index('idx_sample_order').on(table.sampleOrderId),
    roundIdx: index('idx_round').on(table.sampleOrderId, table.round),
  })
);

export const salSampleQuotation = mysqlTable(
  'sal_sample_quotation',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    sampleOrderId: bigint('sample_order_id', { mode: 'number', unsigned: true }).notNull(),
    quotationNo: varchar('quotation_no', { length: 50 }).notNull(),
    version: int('version').notNull().default(1),
    materialCost: decimal('material_cost', { precision: 14, scale: 4 }).default('0.0000'),
    laborCost: decimal('labor_cost', { precision: 14, scale: 4 }).default('0.0000'),
    toolCost: decimal('tool_cost', { precision: 14, scale: 4 }).default('0.0000'),
    overheadCost: decimal('overhead_cost', { precision: 14, scale: 4 }).default('0.0000'),
    totalCost: decimal('total_cost', { precision: 14, scale: 4 }).default('0.0000'),
    currency: varchar('currency', { length: 10 }).default('CNY'),
    exchangeRate: decimal('exchange_rate', { precision: 18, scale: 4 }).default('1.0000'),
    profitRate: decimal('profit_rate', { precision: 6, scale: 2 }).default('20.00'),
    quotedPrice: decimal('quoted_price', { precision: 14, scale: 4 }).default('0.0000'),
    status: tinyint('status').default(1),
    validUntil: date('valid_until'),
    remark: text('remark'),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    sampleOrderIdx: index('idx_sample_order').on(table.sampleOrderId),
    quotationNoIdx: uniqueIndex('uk_quotation_no').on(table.quotationNo),
    statusIdx: index('idx_quotation_status').on(table.status),
  })
);

export type DcprintSampleProcessCard = typeof dcprintSampleProcessCard.$inferSelect;
export type DcprintSampleProcessItem = typeof dcprintSampleProcessItem.$inferSelect;
export type DcprintSampleProcessStep = typeof dcprintSampleProcessStep.$inferSelect;
export type SampleOrder = typeof sampleOrder.$inferSelect;
export type SalSampleFeedback = typeof salSampleFeedback.$inferSelect;
export type SalSampleQuotation = typeof salSampleQuotation.$inferSelect;