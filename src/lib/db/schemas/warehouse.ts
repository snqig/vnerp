import { bigint, date, datetime, decimal, index, int, mysqlTable, serial, text, timestamp, tinyint, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
export const invMaterial = mysqlTable(
  'inv_material',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    materialCode: varchar('material_code', { length: 50 }).notNull(),
    materialName: varchar('material_name', { length: 100 }).notNull(),
    specification: varchar('specification', { length: 255 }),
    categoryId: bigint('category_id', { mode: 'number', unsigned: true }),
    materialType: tinyint('material_type'),
    unit: varchar('unit', { length: 20 }),
    barcode: varchar('barcode', { length: 50 }),
    brand: varchar('brand', { length: 50 }),
    safetyStock: decimal('safety_stock', { precision: 18, scale: 4 }).default('0.0000'),
    maxStock: decimal('max_stock', { precision: 18, scale: 4 }),
    minStock: decimal('min_stock', { precision: 18, scale: 4 }),
    purchasePrice: decimal('purchase_price', { precision: 18, scale: 4 }),
    salePrice: decimal('sale_price', { precision: 18, scale: 4 }),
    costPrice: decimal('cost_price', { precision: 18, scale: 4 }),
    warehouseId: bigint('warehouse_id', { mode: 'number', unsigned: true }),
    shelfLife: int('shelf_life'),
    warningDays: int('warning_days'),
    isBatchManaged: tinyint('is_batch_managed').default(0),
    isSerialManaged: tinyint('is_serial_managed').default(0),
    status: tinyint('status').default(1),
    remark: text('remark'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    materialCodeIdx: index('idx_material_code').on(table.materialCode),
    materialTypeIdx: index('idx_material_type').on(table.materialType, table.deleted),
    warehouseIdx: index('idx_warehouse').on(table.warehouseId),
  })
);

export const invInventoryBatch = mysqlTable(
  'inv_inventory_batch',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    batchNo: varchar('batch_no', { length: 50 }).notNull(),
    materialId: bigint('material_id', { mode: 'number', unsigned: true }).notNull(),
    materialName: varchar('material_name', { length: 100 }).notNull(),
    warehouseId: bigint('warehouse_id', { mode: 'number', unsigned: true }).notNull(),
    warehouseName: varchar('warehouse_name', { length: 100 }),
    quantity: decimal('quantity', { precision: 12, scale: 3 }).default('0.000'),
    availableQty: decimal('available_qty', { precision: 12, scale: 3 }).default('0.000'),
    lockedQty: decimal('locked_qty', { precision: 12, scale: 3 }).default('0.000'),
    unit: varchar('unit', { length: 20 }).default('件'),
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).default('0.00'),
    produceDate: date('produce_date'),
    expireDate: date('expire_date'),
    inboundDate: date('inbound_date'),
    status: tinyint('status').default(1),
    version: int('version', { unsigned: true }).default(1),
    alertLevel: varchar('alert_level', { length: 20 }).default('normal'),
    lastAlertTime: timestamp('last_alert_time'),
    inspectionStatus: varchar('inspection_status', { length: 20 }).default('pending'),
    quarantineStatus: varchar('quarantine_status', { length: 20 }).default('none'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    batchNoIdx: index('uk_batch_no').on(table.batchNo),
    materialIdx: index('idx_material').on(table.materialId),
    warehouseIdx: index('idx_warehouse').on(table.warehouseId),
    statusIdx: index('idx_status').on(table.status),
    alertLevelIdx: index('idx_alert_level').on(table.alertLevel),
  })
);

export const invInboundOrders = mysqlTable(
  'inv_inbound_order',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    orderNo: varchar('order_no', { length: 50 }).notNull(),
    orderType: varchar('order_type', { length: 20 }).default('purchase'),
    warehouseId: bigint('warehouse_id', { mode: 'number', unsigned: true }).notNull(),
    warehouseCode: varchar('warehouse_code', { length: 50 }),
    warehouseName: varchar('warehouse_name', { length: 100 }),
    supplierId: bigint('supplier_id', { mode: 'number', unsigned: true }),
    supplierName: varchar('supplier_name', { length: 100 }),
    operatorId: bigint('operator_id', { mode: 'number', unsigned: true }),
    operatorName: varchar('operator_name', { length: 50 }),
    poId: bigint('po_id', { mode: 'number', unsigned: true }),
    poNo: varchar('po_no', { length: 50 }),
    grnType: varchar('grn_type', { length: 10 }).default('po'),
    totalAmount: decimal('total_amount', { precision: 18, scale: 4 }),
    currency: varchar('currency', { length: 10 }).default('CNY'),
    exchangeRate: decimal('exchange_rate', { precision: 18, scale: 4 }).default('1.0000'),
    baseTotalAmount: decimal('base_total_amount', { precision: 18, scale: 4 }),
    totalQuantity: decimal('total_quantity', { precision: 18, scale: 4 }).default('0.0000'),
    status: varchar('status', { length: 20 }).default('draft'),
    qcStatus: varchar('qc_status', { length: 20 }).default('pending'),
    inboundDate: date('inbound_date'),
    remark: text('remark'),
    createBy: int('create_by', { unsigned: true }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateBy: int('update_by', { unsigned: true }),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    orderNoIdx: index('idx_order_no').on(table.orderNo),
    statusIdx: index('idx_status').on(table.status),
    warehouseIdx: index('idx_warehouse').on(table.warehouseId),
    poIdIdx: index('idx_po_id').on(table.poId),
  })
);

export const invInboundItems = mysqlTable(
  'inv_inbound_item',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    orderId: int('order_id', { unsigned: true }).notNull(),
    materialId: bigint('material_id', { mode: 'number', unsigned: true }),
    materialName: varchar('material_name', { length: 100 }).notNull(),
    materialSpec: varchar('material_spec', { length: 200 }),
    batchNo: varchar('batch_no', { length: 50 }),
    quantity: decimal('quantity', { precision: 18, scale: 4 }),
    unit: varchar('unit', { length: 20 }),
    unitPrice: decimal('unit_price', { precision: 18, scale: 4 }),
    totalPrice: decimal('total_price', { precision: 18, scale: 4 }),
    baseUnitPrice: decimal('base_unit_price', { precision: 18, scale: 4 }),
    baseAmount: decimal('base_amount', { precision: 18, scale: 4 }),
    warehouseLocation: varchar('warehouse_location', { length: 50 }),
    produceDate: date('produce_date'),
    expireDate: date('expire_date'),
    remark: text('remark'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    orderIdx: index('idx_order').on(table.orderId),
    materialIdx: index('idx_material').on(table.materialId),
    batchIdx: index('idx_batch').on(table.batchNo),
  })
);

export const invWarehouse = mysqlTable(
  'inv_warehouse',
  {
    id: serial('id').primaryKey(),
    warehouseCode: varchar('warehouse_code', { length: 50 }).notNull(),
    warehouseName: varchar('warehouse_name', { length: 100 }).notNull(),
    warehouseType: tinyint('warehouse_type'),
    province: varchar('province', { length: 50 }),
    city: varchar('city', { length: 50 }),
    address: varchar('address', { length: 255 }),
    managerId: bigint('manager_id', { mode: 'number', unsigned: true }),
    contactPhone: varchar('contact_phone', { length: 20 }),
    status: tinyint('status').default(1),
    remark: varchar('remark', { length: 255 }),
    deleted: tinyint('deleted').default(0),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    warehouseCodeIdx: uniqueIndex('uk_warehouse_code').on(table.warehouseCode),
    statusIdx: index('idx_warehouse_status').on(table.status, table.deleted),
    managerIdx: index('idx_manager').on(table.managerId),
  })
);

export const invInventory = mysqlTable(
  'inv_inventory',
  {
    id: serial('id').primaryKey(),
    materialId: bigint('material_id', { mode: 'number', unsigned: true }).notNull(),
    materialCode: varchar('material_code', { length: 50 }),
    materialName: varchar('material_name', { length: 100 }),
    warehouseId: bigint('warehouse_id', { mode: 'number', unsigned: true }).notNull(),
    warehouseName: varchar('warehouse_name', { length: 100 }),
    quantity: decimal('quantity', { precision: 18, scale: 4 }).default('0.0000'),
    availableQty: decimal('available_qty', { precision: 18, scale: 4 }).default('0.0000'),
    batchNo: varchar('batch_no', { length: 50 }),
    lockedQty: decimal('locked_qty', { precision: 18, scale: 4 }).default('0.0000'),
    unit: varchar('unit', { length: 20 }),
    unitCost: decimal('unit_cost', { precision: 18, scale: 4 }).default('0.0000'),
    totalCost: decimal('total_cost', { precision: 18, scale: 4 }).default('0.0000'),
    safetyStock: decimal('safety_stock', { precision: 18, scale: 4 }).default('0.0000'),
    version: int('version', { unsigned: true }).default(1),
    deleted: tinyint('deleted').default(0),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    materialWarehouseIdx: uniqueIndex('uk_material_warehouse').on(
      table.materialId,
      table.warehouseId
    ),
    materialIdx: index('idx_material').on(table.materialId),
    warehouseIdx: index('idx_warehouse').on(table.warehouseId),
    materialCodeIdx: index('idx_material_code').on(table.materialCode),
  })
);

export const invOutboundOrders = mysqlTable(
  'inv_outbound_order',
  {
    id: serial('id').primaryKey(),
    orderNo: varchar('order_no', { length: 50 }).notNull(),
    orderDate: date('order_date'),
    outboundType: varchar('outbound_type', { length: 20 }).default('sale'),
    warehouseId: bigint('warehouse_id', { mode: 'number', unsigned: true }),
    warehouseCode: varchar('warehouse_code', { length: 50 }),
    warehouseName: varchar('warehouse_name', { length: 100 }),
    totalQty: decimal('total_qty', { precision: 18, scale: 4 }).default('0.0000'),
    totalAmount: decimal('total_amount', { precision: 18, scale: 4 }).default('0.0000'),
    currency: varchar('currency', { length: 10 }).default('CNY'),
    exchangeRate: decimal('exchange_rate', { precision: 18, scale: 4 }).default('1.0000'),
    baseTotalAmount: decimal('base_total_amount', { precision: 18, scale: 4 }),
    status: varchar('status', { length: 20 }).default('draft'),
    remark: text('remark'),
    operatorName: varchar('operator_name', { length: 50 }),
    operatorId: bigint('operator_id', { mode: 'number', unsigned: true }),
    auditStatus: varchar('audit_status', { length: 20 }).default('pending'),
    auditorName: varchar('auditor_name', { length: 50 }),
    auditTime: datetime('audit_time'),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    deleted: tinyint('deleted').default(0),
    version: int('version').default(0),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    orderNoIdx: uniqueIndex('uk_order_no').on(table.orderNo),
    warehouseIdx: index('idx_warehouse').on(table.warehouseId),
    statusIdx: index('idx_status').on(table.status),
    operatorIdx: index('idx_operator').on(table.operatorId),
  })
);

export const invOutboundItems = mysqlTable(
  'inv_outbound_item',
  {
    id: serial('id').primaryKey(),
    orderId: bigint('order_id', { mode: 'number', unsigned: true }).notNull(),
    materialId: bigint('material_id', { mode: 'number', unsigned: true }).notNull(),
    materialName: varchar('material_name', { length: 100 }),
    materialSpec: varchar('material_spec', { length: 255 }),
    quantity: decimal('quantity', { precision: 18, scale: 4 }).notNull(),
    unit: varchar('unit', { length: 20 }),
    unitPrice: decimal('unit_price', { precision: 18, scale: 4 }),
    amount: decimal('amount', { precision: 18, scale: 4 }),
    baseUnitPrice: decimal('base_unit_price', { precision: 18, scale: 4 }),
    baseAmount: decimal('base_amount', { precision: 18, scale: 4 }),
    batchNo: varchar('batch_no', { length: 50 }),
    remark: varchar('remark', { length: 255 }),
    deleted: tinyint('deleted').default(0),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    orderIdx: index('idx_order').on(table.orderId),
    materialIdx: index('idx_material').on(table.materialId),
  })
);

export const invTransferOrders = mysqlTable(
  'inv_transfer_order',
  {
    id: serial('id').primaryKey(),
    transferNo: varchar('transfer_no', { length: 30 }).notNull(),
    type: tinyint('type').notNull(),
    fromWarehouseId: bigint('from_warehouse_id', { mode: 'number', unsigned: true }).notNull(),
    toWarehouseId: bigint('to_warehouse_id', { mode: 'number', unsigned: true }).notNull(),
    fromLocation: varchar('from_location', { length: 50 }),
    toLocation: varchar('to_location', { length: 50 }),
    status: tinyint('status').notNull().default(0),
    applicantId: bigint('applicant_id', { mode: 'number', unsigned: true }),
    applicantName: varchar('applicant_name', { length: 50 }),
    approverId: bigint('approver_id', { mode: 'number', unsigned: true }),
    approverName: varchar('approver_name', { length: 50 }),
    operatorId: bigint('operator_id', { mode: 'number', unsigned: true }),
    operatorName: varchar('operator_name', { length: 50 }),
    outTime: datetime('out_time'),
    inTime: datetime('in_time'),
    totalQty: decimal('total_qty', { precision: 18, scale: 4 }).default('0.0000'),
    totalAmount: decimal('total_amount', { precision: 18, scale: 4 }).default('0.0000'),
    version: int('version').default(0),
    remark: varchar('remark', { length: 500 }),
    deleted: tinyint('deleted').default(0),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    transferNoIdx: uniqueIndex('uk_transfer_no').on(table.transferNo),
    statusIdx: index('idx_status').on(table.status),
    fromWarehouseIdx: index('idx_from_warehouse').on(table.fromWarehouseId),
    toWarehouseIdx: index('idx_to_warehouse').on(table.toWarehouseId),
    operatorIdx: index('idx_operator').on(table.operatorId),
    applicantIdx: index('idx_applicant').on(table.applicantId),
    approverIdx: index('idx_approver').on(table.approverId),
  })
);

export const invStocktaking = mysqlTable(
  'inv_stocktaking',
  {
    id: serial('id').primaryKey(),
    takingNo: varchar('taking_no', { length: 50 }).notNull(),
    takingType: tinyint('taking_type').default(1),
    warehouseId: bigint('warehouse_id', { mode: 'number', unsigned: true }).notNull(),
    status: tinyint('status').default(1),
    takingDate: date('taking_date'),
    operatorId: bigint('operator_id', { mode: 'number', unsigned: true }),
    operatorName: varchar('operator_name', { length: 50 }),
    remark: varchar('remark', { length: 500 }),
    deleted: tinyint('deleted').default(0),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    takingNoIdx: uniqueIndex('uk_taking_no').on(table.takingNo),
    warehouseIdx: index('idx_warehouse').on(table.warehouseId),
    statusIdx: index('idx_status').on(table.status),
  })
);

export type InvMaterial = typeof invMaterial.$inferSelect;
export type InvInventoryBatch = typeof invInventoryBatch.$inferSelect;
export type InvInboundOrder = typeof invInboundOrders.$inferSelect;
export type InvInboundItem = typeof invInboundItems.$inferSelect;
export type InvWarehouse = typeof invWarehouse.$inferSelect;
export type InvInventory = typeof invInventory.$inferSelect;
export type InvOutboundOrder = typeof invOutboundOrders.$inferSelect;
export type InvOutboundItem = typeof invOutboundItems.$inferSelect;
export type InvTransferOrder = typeof invTransferOrders.$inferSelect;
export type InvStocktaking = typeof invStocktaking.$inferSelect;