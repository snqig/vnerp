import { bigint, date, datetime, decimal, index, int, mysqlTable, serial, text, tinyint, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
export const prdWorkOrder = mysqlTable(
  'prd_work_order',
  {
    id: serial('id').primaryKey(),
    workOrderNo: varchar('work_order_no', { length: 50 }).notNull(),
    workOrderDate: date('work_order_date'),
    salesOrderId: bigint('sales_order_id', { mode: 'number', unsigned: true }),
    materialId: bigint('material_id', { mode: 'number', unsigned: true }).notNull(),
    planQty: decimal('plan_qty', { precision: 18, scale: 4 }).notNull(),
    completedQty: decimal('completed_qty', { precision: 18, scale: 4 }).default('0.0000'),
    unit: varchar('unit', { length: 20 }),
    planStartDate: date('plan_start_date'),
    planEndDate: date('plan_end_date'),
    actualStartDate: date('actual_start_date'),
    actualEndDate: date('actual_end_date'),
    workshopId: bigint('workshop_id', { mode: 'number', unsigned: true }),
    workcenterId: bigint('workcenter_id', { mode: 'number', unsigned: true }),
    priority: tinyint('priority').default(1),
    status: tinyint('status').default(1),
    remark: text('remark'),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    deleted: tinyint('deleted').default(0),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workOrderNoIdx: uniqueIndex('uk_work_order_no').on(table.workOrderNo),
    materialIdx: index('idx_material').on(table.materialId),
    statusIdx: index('idx_status').on(table.status),
    salesOrderIdx: index('idx_sales_order').on(table.salesOrderId),
    workshopIdx: index('idx_workshop').on(table.workshopId),
    workcenterIdx: index('idx_workcenter').on(table.workcenterId),
  })
);

export const prdSchedule = mysqlTable(
  'prd_schedule',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
    scheduleNo: varchar('schedule_no', { length: 50 }).notNull(),
    workOrderId: bigint('work_order_id', { mode: 'number', unsigned: true }),
    orderId: bigint('order_id', { mode: 'number', unsigned: true }),
    orderNo: varchar('order_no', { length: 50 }),
    productId: bigint('product_id', { mode: 'number', unsigned: true }),
    productCode: varchar('product_code', { length: 50 }),
    productName: varchar('product_name', { length: 100 }),
    workshop: varchar('workshop', { length: 30 }),
    plannedQty: decimal('planned_qty', { precision: 12, scale: 3 }),
    completedQty: decimal('completed_qty', { precision: 12, scale: 3 }).default('0'),
    plannedStart: datetime('planned_start'),
    plannedEnd: datetime('planned_end'),
    actualStart: datetime('actual_start'),
    actualEnd: datetime('actual_end'),
    priority: tinyint('priority').default(2),
    status: tinyint('status').default(1),
    scheduler: varchar('scheduler', { length: 50 }),
    remark: text('remark'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    scheduleNoIdx: uniqueIndex('uk_schedule_no').on(table.scheduleNo),
    workOrderIdIdx: index('idx_schedule_work_order').on(table.workOrderId),
    workshopIdx: index('idx_schedule_workshop').on(table.workshop),
    statusIdx: index('idx_schedule_status').on(table.status),
    plannedStartIdx: index('idx_schedule_planned_start').on(table.plannedStart),
  })
);

export const prdScheduleDetail = mysqlTable(
  'prd_schedule_detail',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
    scheduleId: bigint('schedule_id', { mode: 'number', unsigned: true }),
    workOrderId: bigint('work_order_id', { mode: 'number', unsigned: true }),
    colorSeqNo: int('color_seq_no'),
    colorName: varchar('color_name', { length: 50 }),
    equipmentId: bigint('equipment_id', { mode: 'number', unsigned: true }),
    equipmentName: varchar('equipment_name', { length: 100 }),
    plannedStart: datetime('planned_start'),
    plannedEnd: datetime('planned_end'),
    actualStart: datetime('actual_start'),
    actualEnd: datetime('actual_end'),
    durationHours: decimal('duration_hours', { precision: 8, scale: 2 }),
    status: tinyint('status').default(1),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    scheduleIdIdx: index('idx_detail_schedule').on(table.scheduleId),
    workOrderIdIdx: index('idx_detail_work_order').on(table.workOrderId),
  })
);

export const prdPickOrder = mysqlTable(
  'prd_material_issue',
  {
    id: serial('id').primaryKey(),
    pickNo: varchar('pick_no', { length: 50 }).notNull(),
    workOrderId: bigint('work_order_id', { mode: 'number', unsigned: true }).notNull(),
    warehouseId: bigint('warehouse_id', { mode: 'number', unsigned: true }),
    pickerName: varchar('picker_name', { length: 100 }),
    totalQty: decimal('total_qty', { precision: 18, scale: 4 }).default('0'),
    status: tinyint('status').default(1),
    remark: text('remark'),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    pickNoIdx: uniqueIndex('uk_pick_no').on(table.pickNo),
    workOrderIdx: index('idx_pick_work_order').on(table.workOrderId),
    statusIdx: index('idx_pick_status').on(table.status),
  })
);

export const prdPickOrderItem = mysqlTable(
  'prd_material_issue_item',
  {
    id: serial('id').primaryKey(),
    pickOrderId: bigint('pick_order_id', { mode: 'number', unsigned: true }).notNull(),
    materialId: bigint('material_id', { mode: 'number', unsigned: true }),
    materialName: varchar('material_name', { length: 200 }),
    materialSpec: varchar('material_spec', { length: 200 }),
    requiredQty: decimal('required_qty', { precision: 18, scale: 4 }).default('0'),
    actualQty: decimal('actual_qty', { precision: 18, scale: 4 }).default('0'),
    batchNo: varchar('batch_no', { length: 50 }),
    unitCost: decimal('unit_cost', { precision: 18, scale: 4 }).default('0'),
    lineAmount: decimal('line_amount', { precision: 18, scale: 4 }).default('0'),
    unit: varchar('unit', { length: 20 }).default('pcs'),
    remark: text('remark'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    pickOrderIdx: index('idx_pick_item_order').on(table.pickOrderId),
    materialIdx: index('idx_pick_item_material').on(table.materialId),
  })
);

export const prdReturnOrder = mysqlTable(
  'prd_material_return',
  {
    id: serial('id').primaryKey(),
    returnNo: varchar('return_no', { length: 50 }).notNull(),
    workOrderId: bigint('work_order_id', { mode: 'number', unsigned: true }).notNull(),
    pickOrderId: bigint('pick_order_id', { mode: 'number', unsigned: true }),
    warehouseId: bigint('warehouse_id', { mode: 'number', unsigned: true }),
    returnReason: varchar('return_reason', { length: 500 }),
    totalQty: decimal('total_qty', { precision: 18, scale: 4 }).default('0'),
    status: tinyint('status').default(1),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    returnNoIdx: uniqueIndex('uk_return_no').on(table.returnNo),
    workOrderIdx: index('idx_return_work_order').on(table.workOrderId),
    statusIdx: index('idx_return_status').on(table.status),
  })
);

export const prdReturnOrderItem = mysqlTable(
  'prd_material_return_item',
  {
    id: serial('id').primaryKey(),
    returnOrderId: bigint('return_order_id', { mode: 'number', unsigned: true }).notNull(),
    pickOrderItemId: bigint('pick_order_item_id', { mode: 'number', unsigned: true }),
    materialId: bigint('material_id', { mode: 'number', unsigned: true }),
    materialName: varchar('material_name', { length: 200 }),
    quantity: decimal('quantity', { precision: 18, scale: 4 }).default('0'),
    batchNo: varchar('batch_no', { length: 50 }),
    unitCost: decimal('unit_cost', { precision: 18, scale: 4 }).default('0'),
    lineAmount: decimal('line_amount', { precision: 18, scale: 4 }).default('0'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    returnOrderIdx: index('idx_return_item_order').on(table.returnOrderId),
    materialIdx: index('idx_return_item_material').on(table.materialId),
  })
);

export const prdWorkReport = mysqlTable(
  'prd_work_report',
  {
    id: serial('id').primaryKey(),
    reportNo: varchar('report_no', { length: 50 }).notNull(),
    workOrderId: bigint('work_order_id', { mode: 'number', unsigned: true }).notNull(),
    processName: varchar('process_name', { length: 100 }),
    equipmentId: bigint('equipment_id', { mode: 'number', unsigned: true }),
    equipmentName: varchar('equipment_name', { length: 100 }),
    shift: varchar('shift', { length: 20 }),
    operatorName: varchar('operator_name', { length: 100 }),
    qualifiedQty: decimal('qualified_qty', { precision: 18, scale: 4 }).default('0'),
    defectiveQty: decimal('defective_qty', { precision: 18, scale: 4 }).default('0'),
    defectReason: varchar('defect_reason', { length: 500 }),
    workHours: decimal('work_hours', { precision: 10, scale: 2 }).default('0'),
    reportDate: date('report_date'),
    status: tinyint('status').default(1),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    reportNoIdx: uniqueIndex('uk_report_no').on(table.reportNo),
    workOrderIdx: index('idx_report_work_order').on(table.workOrderId),
    statusIdx: index('idx_report_status').on(table.status),
    reportDateIdx: index('idx_report_date').on(table.reportDate),
  })
);

export const prdFinishOrder = mysqlTable(
  'prd_finish_order',
  {
    id: serial('id').primaryKey(),
    finishNo: varchar('finish_no', { length: 50 }).notNull(),
    workOrderId: bigint('work_order_id', { mode: 'number', unsigned: true }).notNull(),
    warehouseId: bigint('warehouse_id', { mode: 'number', unsigned: true }),
    qualifiedQty: decimal('qualified_qty', { precision: 18, scale: 4 }).default('0'),
    defectiveQty: decimal('defective_qty', { precision: 18, scale: 4 }).default('0'),
    status: tinyint('status').default(1),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    finishNoIdx: uniqueIndex('uk_finish_no').on(table.finishNo),
    workOrderIdx: index('idx_finish_work_order').on(table.workOrderId),
    statusIdx: index('idx_finish_status').on(table.status),
  })
);

export const prdStandardCard = mysqlTable(
  'prd_standard_card',
  {
    id: serial('id').primaryKey(),
    cardNo: varchar('card_no', { length: 50 }).notNull(),
    name: varchar('name', { length: 200 }),
    type: varchar('type', { length: 20 }).default('process'),
    customerId: bigint('customer_id', { mode: 'number', unsigned: true }),
    customerName: varchar('customer_name', { length: 100 }),
    customerCode: varchar('customer_code', { length: 50 }),
    productName: varchar('product_name', { length: 100 }),
    version: varchar('version', { length: 10 }),
    effectiveDate: date('effective_date'),
    expiryDate: date('expiry_date'),
    createUser: int('create_user'),
    auditUser: int('audit_user'),
    date: date('date'),
    documentCode: varchar('document_code', { length: 50 }),
    finishedSize: varchar('finished_size', { length: 50 }),
    tolerance: varchar('tolerance', { length: 50 }),
    materialName: varchar('material_name', { length: 100 }),
    materialType: varchar('material_type', { length: 20 }),
    moldType: varchar('mold_type', { length: 100 }).default(''),
    layoutType: varchar('layout_type', { length: 50 }),
    spacing: varchar('spacing', { length: 20 }),
    spacingValue: varchar('spacing_value', { length: 20 }),
    sheetWidth: varchar('sheet_width', { length: 20 }),
    sheetLength: varchar('sheet_length', { length: 20 }),
    coreType: varchar('core_type', { length: 50 }),
    paperDirection: varchar('paper_direction', { length: 20 }),
    rollWidth: varchar('roll_width', { length: 20 }),
    paperEdge: varchar('paper_edge', { length: 20 }),
    standardUsage: varchar('standard_usage', { length: 50 }),
    jumpDistance: varchar('jump_distance', { length: 20 }),
    processFlow1: varchar('process_flow1', { length: 100 }),
    processFlow2: varchar('process_flow2', { length: 100 }),
    printType: varchar('print_type', { length: 50 }),
    firstJumpDistance: varchar('first_jump_distance', { length: 20 }),
    sequences: text('sequences'),
    filmManufacturer: varchar('film_manufacturer', { length: 100 }),
    filmCode: varchar('film_code', { length: 50 }),
    filmSize: varchar('film_size', { length: 50 }),
    processMethod: varchar('process_method', { length: 50 }),
    stampingMethod: varchar('stamping_method', { length: 50 }),
    moldCode: varchar('mold_code', { length: 50 }),
    backMoldCode: varchar('back_mold_code', { length: 50 }),
    layoutMethod: varchar('layout_method', { length: 50 }),
    layoutWay: varchar('layout_way', { length: 50 }),
    jumpDistance2: varchar('jump_distance2', { length: 20 }),
    mylarMaterial: varchar('mylar_material', { length: 100 }),
    mylarSpecs: varchar('mylar_specs', { length: 50 }),
    mylarLayout: varchar('mylar_layout', { length: 50 }),
    mylarJump: varchar('mylar_jump', { length: 20 }),
    adhesiveType: varchar('adhesive_type', { length: 50 }),
    adhesiveManufacturer: varchar('adhesive_manufacturer', { length: 100 }),
    adhesiveCode: varchar('adhesive_code', { length: 50 }),
    adhesiveSize: varchar('adhesive_size', { length: 50 }),
    adhesiveSpecs: varchar('adhesive_specs', { length: 50 }),
    dashedKnife: tinyint('dashed_knife').default(0),
    slicePerRow: varchar('slice_per_row', { length: 20 }),
    slicePerRoll: varchar('slice_per_roll', { length: 20 }),
    slicePerBundle: varchar('slice_per_bundle', { length: 20 }),
    slicePerBag: varchar('slice_per_bag', { length: 20 }),
    slicePerBox: varchar('slice_per_box', { length: 20 }),
    packingQty: varchar('packing_qty', { length: 20 }),
    backKnifeMold: varchar('back_knife_mold', { length: 50 }),
    backMylarMold: varchar('back_mylar_mold', { length: 50 }),
    etchMold: varchar('etch_mold', { length: 100 }).default(''),
    storageLocation: varchar('storage_location', { length: 100 }).default(''),
    extraField: varchar('extra_field', { length: 100 }).default(''),
    releasePaperCode: varchar('release_paper_code', { length: 50 }),
    releasePaperType: varchar('release_paper_type', { length: 50 }),
    releasePaperCategory: varchar('release_paper_category', { length: 50 }),
    releasePaperSpecs: varchar('release_paper_specs', { length: 50 }),
    paddingMaterial: varchar('padding_material', { length: 100 }),
    packingMaterial: varchar('packing_material', { length: 100 }),
    specialColor: varchar('special_color', { length: 200 }),
    colorFormula: varchar('color_formula', { length: 200 }),
    filePath: varchar('file_path', { length: 200 }),
    sampleInfo: varchar('sample_info', { length: 200 }),
    notes: text('notes'),
    remark: text('remark'),
    glueType: varchar('glue_type', { length: 50 }),
    packingType: varchar('packing_type', { length: 50 }),
    creator: varchar('creator', { length: 50 }),
    reviewer: varchar('reviewer', { length: 50 }),
    factoryManager: varchar('factory_manager', { length: 50 }),
    qualityManager: varchar('quality_manager', { length: 50 }),
    sales: varchar('sales', { length: 50 }),
    approver: varchar('approver', { length: 50 }),
    status: tinyint('status').default(1),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    reviewerId: bigint('reviewer_id', { mode: 'number', unsigned: true }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
  },
  (table) => ({
    cardNoIdx: uniqueIndex('uk_card_no').on(table.cardNo),
    customerIdx: index('idx_customer').on(table.customerId),
    statusIdx: index('idx_status').on(table.status),
    creatorIdx: index('idx_creator').on(table.createBy),
    reviewerIdx: index('idx_reviewer').on(table.reviewerId),
  })
);

export const prdProductLabel = mysqlTable(
  'prd_product_label',
  {
    id: serial('id').primaryKey(),
    labelNo: varchar('label_no', { length: 50 }).notNull(),
    workOrderId: bigint('work_order_id', { mode: 'number', unsigned: true }),
    workOrderNo: varchar('work_order_no', { length: 50 }),
    materialId: bigint('material_id', { mode: 'number', unsigned: true }),
    materialCode: varchar('material_code', { length: 50 }).default(''),
    materialName: varchar('material_name', { length: 200 }).default(''),
    quantity: decimal('quantity', { precision: 12, scale: 2 }).default('0.00'),
    unit: varchar('unit', { length: 20 }).default(''),
    batchNo: varchar('batch_no', { length: 50 }).default(''),
    qcResult: varchar('qc_result', { length: 20 }).default('pending'),
    remark: text('remark'),
    deleted: tinyint('deleted').default(0),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    labelNoIdx: uniqueIndex('uk_label_no').on(table.labelNo),
    workOrderIdx: index('idx_label_work_order').on(table.workOrderId),
  })
);

export const prdBom = mysqlTable(
  'prd_bom',
  {
    id: serial('id').primaryKey(),
    bomName: varchar('bom_name', { length: 200 }).notNull(),
    productId: bigint('product_id', { mode: 'number', unsigned: true }),
    version: varchar('version', { length: 20 }).default('1.0'),
    totalCost: decimal('total_cost', { precision: 18, scale: 4 }).default('0.0000'),
    status: tinyint('status').default(1),
    remark: text('remark'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    deleted: tinyint('deleted').default(0),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
  },
  (table) => ({
    productIdx: index('idx_product').on(table.productId),
  })
);

export const prdBomDetail = mysqlTable(
  'prd_bom_detail',
  {
    id: serial('id').primaryKey(),
    bomId: bigint('bom_id', { mode: 'number', unsigned: true }).notNull(),
    materialId: bigint('material_id', { mode: 'number', unsigned: true }).notNull(),
    materialName: varchar('material_name', { length: 200 }),
    quantity: decimal('quantity', { precision: 18, scale: 4 }).default('0.0000'),
    unit: varchar('unit', { length: 20 }),
    lossRate: decimal('loss_rate', { precision: 18, scale: 4 }).default('0.0000'),
    unitCost: decimal('unit_cost', { precision: 18, scale: 4 }).default('0.0000'),
    totalCost: decimal('total_cost', { precision: 18, scale: 4 }).default('0.0000'),
    itemType: tinyint('item_type').default(1),
    remark: text('remark'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    bomIdx: index('idx_bom').on(table.bomId),
    materialIdx: index('idx_material').on(table.materialId),
  })
);

export const prdBomStd = mysqlTable(
  'prd_bom_std',
  {
    id: serial('id').primaryKey(),
    bomCode: varchar('bom_code', { length: 50 }).notNull(),
    productId: bigint('product_id', { mode: 'number', unsigned: true }).notNull(),
    productName: varchar('product_name', { length: 100 }),
    version: varchar('version', { length: 20 }).notNull().default('V1.0'),
    effectiveDate: date('effective_date').notNull(),
    obsoleteDate: date('obsolete_date'),
    status: tinyint('status').notNull().default(1),
    remark: text('remark'),
    legacySource: varchar('legacy_source', { length: 30 }),
    legacyId: bigint('legacy_id', { mode: 'number', unsigned: true }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    bomCodeIdx: uniqueIndex('uk_bom_code').on(table.bomCode),
    productIdx: index('idx_product_id').on(table.productId),
    statusIdx: index('idx_status').on(table.status),
    effectiveDateIdx: index('idx_effective_date').on(table.effectiveDate),
    legacyIdx: index('idx_legacy').on(table.legacySource, table.legacyId),
  })
);

export const prdBomLineStd = mysqlTable(
  'prd_bom_line_std',
  {
    id: serial('id').primaryKey(),
    bomId: bigint('bom_id', { mode: 'number', unsigned: true }).notNull(),
    lineNo: int('line_no').notNull().default(1),
    materialId: bigint('material_id', { mode: 'number', unsigned: true }).notNull(),
    materialCode: varchar('material_code', { length: 50 }),
    materialName: varchar('material_name', { length: 100 }),
    consumptionQty: decimal('consumption_qty', { precision: 18, scale: 4 }).notNull(),
    wasteRate: decimal('waste_rate', { precision: 18, scale: 4 }).notNull().default('0.0000'),
    materialType: tinyint('material_type').default(1),
    remark: varchar('remark', { length: 200 }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    bomIdx: index('idx_bom_id').on(table.bomId),
    materialIdx: index('idx_material_id').on(table.materialId),
  })
);

export const prdProcessCard = mysqlTable(
  'prd_process_card',
  {
    id: serial('id').primaryKey(),
    cardNo: varchar('card_no', { length: 50 }).notNull(),
    qrCode: varchar('qr_code', { length: 255 }),
    workOrderId: bigint('work_order_id', { mode: 'number', unsigned: true }),
    workOrderNo: varchar('work_order_no', { length: 50 }),
    productCode: varchar('product_code', { length: 50 }),
    productName: varchar('product_name', { length: 200 }),
    materialSpec: varchar('material_spec', { length: 200 }),
    workOrderDate: date('work_order_date'),
    planQty: decimal('plan_qty', { precision: 18, scale: 4 }).default('0.0000'),
    mainLabelId: bigint('main_label_id', { mode: 'number', unsigned: true }),
    mainLabelNo: varchar('main_label_no', { length: 50 }),
    burdeningStatus: tinyint('burdening_status').default(0),
    lockStatus: tinyint('lock_status').default(0),
    createUserId: bigint('create_user_id', { mode: 'number', unsigned: true }),
    createUserName: varchar('create_user_name', { length: 50 }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    cardNoIdx: uniqueIndex('uk_card_no').on(table.cardNo),
    workOrderIdx: index('idx_work_order').on(table.workOrderId),
    mainLabelIdx: index('idx_main_label').on(table.mainLabelId),
  })
);

export const prdProcessCardMaterial = mysqlTable(
  'prd_process_card_material',
  {
    id: serial('id').primaryKey(),
    cardId: bigint('card_id', { mode: 'number', unsigned: true }).notNull(),
    cardNo: varchar('card_no', { length: 50 }),
    labelId: bigint('label_id', { mode: 'number', unsigned: true }).notNull(),
    labelNo: varchar('label_no', { length: 50 }).notNull(),
    materialType: tinyint('material_type').default(1),
    materialCode: varchar('material_code', { length: 50 }),
    materialName: varchar('material_name', { length: 200 }),
    specification: varchar('specification', { length: 200 }),
    batchNo: varchar('batch_no', { length: 50 }),
    quantity: decimal('quantity', { precision: 18, scale: 4 }).default('0.0000'),
    unit: varchar('unit', { length: 20 }),
    remark: varchar('remark', { length: 500 }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    cardIdx: index('idx_card_id').on(table.cardId),
    labelIdx: index('idx_label_id').on(table.labelId),
  })
);

export const prdProcessRoute = mysqlTable(
  'prd_process_route',
  {
    id: serial('id').primaryKey(),
    routeCode: varchar('route_code', { length: 50 }).notNull(),
    routeName: varchar('route_name', { length: 100 }).notNull(),
    productId: bigint('product_id', { mode: 'number', unsigned: true }),
    version: varchar('version', { length: 10 }).default('1.0'),
    isDefault: tinyint('is_default').default(1),
    status: tinyint('status').default(1),
    remark: text('remark'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    routeCodeIdx: uniqueIndex('uk_route_code').on(table.routeCode),
    productIdx: index('idx_product').on(table.productId),
  })
);

export const prdProcessRouteStep = mysqlTable(
  'prd_process_route_step',
  {
    id: serial('id').primaryKey(),
    routeId: bigint('route_id', { mode: 'number', unsigned: true }).notNull(),
    stepSeq: int('step_seq').notNull(),
    stepName: varchar('step_name', { length: 50 }).notNull(),
    stepType: tinyint('step_type'),
    equipmentType: tinyint('equipment_type'),
    standardTime: decimal('standard_time', { precision: 10, scale: 2 }),
    setupTime: decimal('setup_time', { precision: 10, scale: 2 }),
    isKeyProcess: tinyint('is_key_process').default(0),
    isFirstPieceRequired: tinyint('is_first_piece_required').default(0),
    qualityCheck: tinyint('quality_check').default(0),
    remark: varchar('remark', { length: 255 }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    routeIdx: index('idx_route').on(table.routeId),
  })
);

export const prdWorkOrderColorSeq = mysqlTable(
  'prd_work_order_color_seq',
  {
    id: serial('id').primaryKey(),
    workOrderId: bigint('work_order_id', { mode: 'number', unsigned: true }).notNull(),
    seqNo: int('seq_no').notNull(),
    colorName: varchar('color_name', { length: 50 }).notNull(),
    screenPlateId: bigint('screen_plate_id', { mode: 'number', unsigned: true }),
    inkFormulaId: bigint('ink_formula_id', { mode: 'number', unsigned: true }),
    estimatedDurationHours: decimal('estimated_duration_hours', {
      precision: 18,
      scale: 4,
    }).default('4.0000'),
    equipmentTypeRequired: varchar('equipment_type_required', { length: 50 }).notNull(),
    dependsOnSeq: int('depends_on_seq'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    workOrderSeqUnique: uniqueIndex('uk_work_order_seq').on(table.workOrderId, table.seqNo),
    workOrderIdx: index('idx_work_order').on(table.workOrderId),
    screenPlateIdx: index('idx_screen_plate').on(table.screenPlateId),
    inkFormulaIdx: index('idx_ink_formula').on(table.inkFormulaId),
  })
);

export const prdWorkOrderBom = mysqlTable(
  'prd_work_order_bom',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    workOrderId: bigint('work_order_id', { mode: 'number', unsigned: true }).notNull(),
    workOrderNo: varchar('work_order_no', { length: 50 }),
    materialId: bigint('material_id', { mode: 'number', unsigned: true }).notNull(),
    materialCode: varchar('material_code', { length: 50 }).notNull(),
    materialName: varchar('material_name', { length: 100 }).notNull(),
    specification: varchar('specification', { length: 255 }),
    unit: varchar('unit', { length: 20 }),
    requiredQty: decimal('required_qty', { precision: 18, scale: 4 }).notNull(),
    pickedQty: decimal('picked_qty', { precision: 18, scale: 4 }).default('0.0000'),
    returnedQty: decimal('returned_qty', { precision: 18, scale: 4 }).default('0.0000'),
    unitCost: decimal('unit_cost', { precision: 18, scale: 4 }).default('0.0000'),
    lineCost: decimal('line_cost', { precision: 18, scale: 4 }).default('0.0000'),
    itemType: tinyint('item_type').default(1),
    sort: int('sort').default(0),
    remark: varchar('remark', { length: 255 }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    workOrderIdx: index('idx_work_order').on(table.workOrderId),
    materialIdx: index('idx_material').on(table.materialId),
  })
);

export type PrdWorkOrder = typeof prdWorkOrder.$inferSelect;
export type PrdPickOrder = typeof prdPickOrder.$inferSelect;
export type PrdPickOrderItem = typeof prdPickOrderItem.$inferSelect;
export type PrdReturnOrder = typeof prdReturnOrder.$inferSelect;
export type PrdReturnOrderItem = typeof prdReturnOrderItem.$inferSelect;
export type PrdWorkReport = typeof prdWorkReport.$inferSelect;
export type PrdFinishOrder = typeof prdFinishOrder.$inferSelect;
export type PrdSchedule = typeof prdSchedule.$inferSelect;
export type PrdScheduleDetail = typeof prdScheduleDetail.$inferSelect;
export type PrdWorkOrderBom = typeof prdWorkOrderBom.$inferSelect;
export type PrdStandardCard = typeof prdStandardCard.$inferSelect;
export type PrdProductLabel = typeof prdProductLabel.$inferSelect;
export type PrdBom = typeof prdBom.$inferSelect;
export type PrdBomDetail = typeof prdBomDetail.$inferSelect;
export type PrdBomStd = typeof prdBomStd.$inferSelect;
export type PrdBomLineStd = typeof prdBomLineStd.$inferSelect;
export type PrdProcessCard = typeof prdProcessCard.$inferSelect;
export type PrdProcessCardMaterial = typeof prdProcessCardMaterial.$inferSelect;
export type PrdProcessRoute = typeof prdProcessRoute.$inferSelect;
export type PrdProcessRouteStep = typeof prdProcessRouteStep.$inferSelect;
export type PrdWorkOrderColorSeq = typeof prdWorkOrderColorSeq.$inferSelect;