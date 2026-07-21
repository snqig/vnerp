import { bigint, date, datetime, decimal, index, int, mysqlTable, serial, text, tinyint, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
export const dcprintTool = mysqlTable(
  'dcprint_tool',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
    toolType: tinyint('tool_type').notNull(), // 1=刀模 2=网版
    toolCode: varchar('tool_code', { length: 50 }),
    toolName: varchar('tool_name', { length: 100 }).notNull(),
    spec: varchar('spec', { length: 255 }),
    materialId: bigint('material_id', { mode: 'number', unsigned: true }),
    totalLife: int('total_life').notNull(),
    warningThreshold: int('warning_threshold').notNull(),
    usedCount: int('used_count').default(0),
    remainLife: int('remain_life').notNull(),
    originalCost: decimal('original_cost', { precision: 18, scale: 4 }).notNull(),
    accumulatedCost: decimal('accumulated_cost', { precision: 18, scale: 4 }).default('0'),
    netValue: decimal('net_value', { precision: 18, scale: 4 }).notNull(),
    unitCost: decimal('unit_cost', { precision: 18, scale: 4 }).notNull(),
    status: tinyint('status').default(1), // 1=待用 2=在用 3=维修中 4=预警 5=已报废
    manufactureDate: date('manufacture_date'),
    warehouseLocation: varchar('warehouse_location', { length: 100 }),
    // 体系B 字段 (刀模)
    assetType: varchar('asset_type', { length: 50 }), // 资产类型
    layoutType: varchar('layout_type', { length: 50 }), // 版面类型
    piecesPerImpression: int('pieces_per_impression'), // 每版印张数
    material: varchar('material', { length: 100 }), // 材质
    qrCode: varchar('qr_code', { length: 255 }), // 二维码
    supplierId: bigint('supplier_id', { mode: 'number', unsigned: true }), // 供应商
    maintenanceInterval: int('maintenance_interval'), // 保养间隔(印数)
    maintenanceCount: int('maintenance_count').default(0), // 保养次数
    lastMaintenanceDate: date('last_maintenance_date'), // 上次保养日期
    lastMaintenanceImpressions: int('last_maintenance_impressions'), // 上次保养印数
    lastUsedDate: date('last_used_date'), // 上次使用日期
    // 体系C 字段 (网版)
    meshCount: varchar('mesh_count', { length: 20 }), // 目数
    meshMaterial: varchar('mesh_material', { length: 50 }), // 丝网材质
    size: varchar('size', { length: 50 }), // 尺寸
    tensionValue: decimal('tension_value', { precision: 5, scale: 1 }), // 张力值
    frameType: varchar('frame_type', { length: 50 }), // 网框类型
    customerId: bigint('customer_id', { mode: 'number', unsigned: true }), // 客户
    reclaimCount: int('reclaim_count').default(0), // 回用次数
    exposureDate: date('exposure_date'), // 曝光日期
    lastCleanDate: date('last_clean_date'), // 上次清洗日期
    lastReclaimDate: date('last_reclaim_date'), // 上次回用日期
    tensionDate: date('tension_date'), // 张力检测日期
    scrapReason: text('scrap_reason'),
    scrapTime: datetime('scrap_time'),
    scrapBy: bigint('scrap_by', { mode: 'number', unsigned: true }),
    remark: text('remark'),
    isDeleted: tinyint('deleted').default(0),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    toolCodeIdx: uniqueIndex('uk_tool_code').on(table.toolCode),
    toolTypeIdx: index('idx_tool_type').on(table.toolType),
    statusIdx: index('idx_tool_status').on(table.status),
  })
);

export const dcprintToolUsage = mysqlTable(
  'dcprint_tool_usage',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
    toolId: bigint('tool_id', { mode: 'number', unsigned: true }).notNull(),
    workOrderId: bigint('work_order_id', { mode: 'number', unsigned: true }),
    workOrderNo: varchar('work_order_no', { length: 50 }),
    processId: bigint('process_id', { mode: 'number', unsigned: true }),
    processName: varchar('process_name', { length: 100 }),
    useCount: int('use_count').default(1),
    operatorId: bigint('operator_id', { mode: 'number', unsigned: true }),
    operatorName: varchar('operator_name', { length: 100 }),
    amortizedCost: decimal('amortized_cost', { precision: 10, scale: 4 }).default('0'),
    useTime: datetime('use_time').notNull(),
    remark: text('remark'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    toolIdIdx: index('idx_usage_tool').on(table.toolId),
    workOrderIdIdx: index('idx_usage_work_order').on(table.workOrderId),
  })
);

export const dcprintToolMaintenance = mysqlTable(
  'dcprint_tool_maintenance',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
    toolId: bigint('tool_id', { mode: 'number', unsigned: true }).notNull(),
    maintenanceType: tinyint('maintenance_type').default(1), // 1=维修 2=保养
    maintenanceCost: decimal('maintenance_cost', { precision: 10, scale: 2 }).default('0'),
    description: text('description'),
    lifeBefore: int('life_before').notNull(),
    lifeAfter: int('life_after').notNull(),
    lifeAdjustment: int('life_adjustment').default(0),
    status: tinyint('status').default(1), // 1=进行中 2=已完成
    startTime: datetime('start_time').notNull(),
    endTime: datetime('end_time'),
    operatorId: bigint('operator_id', { mode: 'number', unsigned: true }),
    operatorName: varchar('operator_name', { length: 100 }),
    remark: text('remark'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    toolIdIdx: index('idx_maintenance_tool').on(table.toolId),
    statusIdx: index('idx_maintenance_status').on(table.status),
  })
);

export const prdDie = mysqlTable(
  'prd_die',
  {
    id: serial('id').primaryKey(),
    dieCode: varchar('die_code', { length: 50 }).notNull(),
    dieName: varchar('die_name', { length: 100 }),
    dieType: varchar('die_type', { length: 50 }),
    sizeSpec: varchar('size_spec', { length: 100 }),
    customerId: bigint('customer_id', { mode: 'number', unsigned: true }),
    productName: varchar('product_name', { length: 200 }),
    maxUseCount: int('max_use_count').default(0),
    usedCount: int('used_count').default(0),
    remainingCount: int('remaining_count').default(0),
    maintenanceDays: int('maintenance_days').default(180),
    lastMaintenanceDate: date('last_maintenance_date'),
    nextMaintenanceDate: date('next_maintenance_date'),
    warehouseId: bigint('warehouse_id', { mode: 'number', unsigned: true }),
    locationId: int('location_id'),
    status: int('status').default(1),
    remark: text('remark'),
    deleted: tinyint('deleted').default(0),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    dieCodeIdx: uniqueIndex('uk_die_code').on(table.dieCode),
    statusIdx: index('idx_die_status').on(table.status, table.deleted),
  })
);

export const prdDieTemplate = mysqlTable(
  'prd_die_template',
  {
    id: serial('id').primaryKey(),
    templateCode: varchar('template_code', { length: 50 }).notNull(),
    templateName: varchar('template_name', { length: 100 }).notNull(),
    assetType: varchar('asset_type', { length: 20 }).default('die'),
    layoutType: varchar('layout_type', { length: 20 }).default('single_row'),
    piecesPerImpression: int('pieces_per_impression').default(1),
    templateType: tinyint('template_type'),
    specification: varchar('specification', { length: 255 }),
    material: varchar('material', { length: 50 }),
    maxUsage: int('max_usage'),
    currentUsage: int('current_usage').default(0),
    remainingUsage: int('remaining_usage'),
    warningUsage: int('warning_usage'),
    maxImpressions: int('max_impressions').default(0),
    cumulativeImpressions: int('cumulative_impressions').default(0),
    warningThreshold: int('warning_threshold').default(80),
    maintenanceInterval: int('maintenance_interval').default(8000),
    maintenanceCount: int('maintenance_count').default(0),
    lastMaintenanceImpressions: int('last_maintenance_impressions').default(0),
    lastMaintenanceDate: date('last_maintenance_date'),
    lastUsedDate: date('last_used_date'),
    status: tinyint('status').default(1),
    dieStatus: varchar('die_status', { length: 30 }).default('available'),
    storageLocation: varchar('storage_location', { length: 100 }),
    purchaseDate: date('purchase_date'),
    supplierId: bigint('supplier_id', { mode: 'number', unsigned: true }),
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).default('0.00'),
    qrCode: varchar('qr_code', { length: 100 }),
    remark: text('remark'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    templateCodeIdx: uniqueIndex('uk_template_code').on(table.templateCode),
    typeIdx: index('idx_type').on(table.templateType),
    statusIdx: index('idx_status').on(table.status),
  })
);

export const prdInk = mysqlTable(
  'prd_ink',
  {
    id: serial('id').primaryKey(),
    inkCode: varchar('ink_code', { length: 50 }).notNull(),
    inkName: varchar('ink_name', { length: 100 }).notNull(),
    inkType: int('ink_type'),
    colorName: varchar('color_name', { length: 50 }),
    colorCode: varchar('color_code', { length: 50 }),
    brand: varchar('brand', { length: 100 }),
    supplierId: bigint('supplier_id', { mode: 'number', unsigned: true }),
    unit: varchar('unit', { length: 20 }).default('kg'),
    specification: varchar('specification', { length: 200 }),
    safetyStock: decimal('safety_stock', { precision: 10, scale: 2 }).default('0.00'),
    shelfLife: int('shelf_life'),
    stockQty: decimal('stock_qty', { precision: 10, scale: 2 }).default('0.00'),
    status: int('status').default(1),
    remark: text('remark'),
    deleted: tinyint('deleted').default(0),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    inkCodeIdx: uniqueIndex('uk_ink_code').on(table.inkCode),
    statusIdx: index('idx_ink_status').on(table.status, table.deleted),
  })
);

export const prdScreenPlate = mysqlTable(
  'prd_screen_plate',
  {
    id: serial('id').primaryKey(),
    plateCode: varchar('plate_code', { length: 50 }).notNull(),
    plateName: varchar('plate_name', { length: 100 }),
    plateType: varchar('plate_type', { length: 50 }),
    meshCount: varchar('mesh_count', { length: 50 }),
    sizeSpec: varchar('size_spec', { length: 100 }),
    customerId: bigint('customer_id', { mode: 'number', unsigned: true }),
    productName: varchar('product_name', { length: 200 }),
    maxUseCount: int('max_use_count').default(0),
    usedCount: int('used_count').default(0),
    remainingCount: int('remaining_count').default(0),
    maintenanceDays: int('maintenance_days').default(360),
    lastMaintenanceDate: date('last_maintenance_date'),
    nextMaintenanceDate: date('next_maintenance_date'),
    warehouseId: bigint('warehouse_id', { mode: 'number', unsigned: true }),
    locationId: int('location_id'),
    storageLocation: varchar('storage_location', { length: 100 }),
    status: int('status').default(1),
    remark: text('remark'),
    deleted: tinyint('deleted').default(0),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    plateCodeIdx: uniqueIndex('uk_plate_code').on(table.plateCode),
    statusIdx: index('idx_screen_plate_status').on(table.status, table.deleted),
  })
);

export type DcprintTool = typeof dcprintTool.$inferSelect;
export type DcprintToolUsage = typeof dcprintToolUsage.$inferSelect;
export type DcprintToolMaintenance = typeof dcprintToolMaintenance.$inferSelect;
export type PrdDie = typeof prdDie.$inferSelect;
export type PrdDieTemplate = typeof prdDieTemplate.$inferSelect;
export type PrdInk = typeof prdInk.$inferSelect;
export type PrdScreenPlate = typeof prdScreenPlate.$inferSelect;