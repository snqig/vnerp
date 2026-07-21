import { bigint, datetime, decimal, index, int, mysqlTable, serial, text, tinyint, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
export const sampleProcessTemplate = mysqlTable(
  'dcprint_sample_process_template',
  {
    id: serial('id').primaryKey(),
    templateNo: varchar('template_no', { length: 50 }).notNull(),
    templateName: varchar('template_name', { length: 100 }).notNull(),
    category: varchar('category', { length: 50 }),
    tags: varchar('tags', { length: 255 }),
    description: text('description'),
    sourceCardId: bigint('source_card_id', { mode: 'number', unsigned: true }),
    customerId: bigint('customer_id', { mode: 'number', unsigned: true }),
    customerName: varchar('customer_name', { length: 100 }),
    productName: varchar('product_name', { length: 200 }),
    substrateMaterialId: bigint('substrate_material_id', { mode: 'number', unsigned: true }),
    substrateMaterialName: varchar('substrate_material_name', { length: 100 }),
    spec: varchar('spec', { length: 255 }),
    printColor: varchar('print_color', { length: 100 }),
    inkColorId: bigint('ink_color_id', { mode: 'number', unsigned: true }),
    screenPlateId: bigint('screen_plate_id', { mode: 'number', unsigned: true }),
    dieToolId: bigint('die_tool_id', { mode: 'number', unsigned: true }),
    materialLossRate: decimal('material_loss_rate', { precision: 5, scale: 2 }).default('5.00'),
    estimatedHour: decimal('estimated_hour', { precision: 6, scale: 2 }),
    diagramUrl: varchar('diagram_url', { length: 500 }),
    totalMaterialCost: decimal('total_material_cost', { precision: 12, scale: 4 }).default(
      '0.0000'
    ),
    totalLaborCost: decimal('total_labor_cost', { precision: 12, scale: 4 }).default('0.0000'),
    totalToolCost: decimal('total_tool_cost', { precision: 12, scale: 4 }).default('0.0000'),
    totalCost: decimal('total_cost', { precision: 12, scale: 4 }).default('0.0000'),
    remark: text('remark'),
    status: tinyint('status').default(1),
    usageCount: int('usage_count').notNull().default(0),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    templateNoIdx: uniqueIndex('uk_spt_template_no').on(table.templateNo),
    categoryIdx: index('idx_spt_category').on(table.category),
    customerIdx: index('idx_spt_customer').on(table.customerId),
  })
);

export const sampleProcessTemplateItem = mysqlTable(
  'dcprint_sample_process_template_item',
  {
    id: serial('id').primaryKey(),
    templateId: bigint('template_id', { mode: 'number', unsigned: true }).notNull(),
    itemType: tinyint('item_type').default(1),
    materialId: bigint('material_id', { mode: 'number', unsigned: true }),
    materialCode: varchar('material_code', { length: 50 }).notNull(),
    materialName: varchar('material_name', { length: 100 }).notNull(),
    specification: varchar('specification', { length: 255 }),
    unitDosage: decimal('unit_dosage', { precision: 18, scale: 4 }).notNull(),
    unit: varchar('unit', { length: 20 }),
    unitCost: decimal('unit_cost', { precision: 18, scale: 4 }).default('0.0000'),
    lineCost: decimal('line_cost', { precision: 18, scale: 4 }).default('0.0000'),
    remark: varchar('remark', { length: 255 }),
    sort: int('sort').notNull().default(0),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    templateIdIdx: index('idx_spt_item_template').on(table.templateId),
  })
);

export const sampleProcessTemplateStep = mysqlTable(
  'dcprint_sample_process_template_step',
  {
    id: serial('id').primaryKey(),
    templateId: bigint('template_id', { mode: 'number', unsigned: true }).notNull(),
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
    templateIdIdx: index('idx_spt_step_template').on(table.templateId),
  })
);

export type SampleProcessTemplate = typeof sampleProcessTemplate.$inferSelect;
export type SampleProcessTemplateItem = typeof sampleProcessTemplateItem.$inferSelect;
export type SampleProcessTemplateStep = typeof sampleProcessTemplateStep.$inferSelect;