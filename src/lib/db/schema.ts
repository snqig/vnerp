/**
 * Drizzle ORM Schema 映射
 *
 * 权威 schema 来源：database/vnerpdacahng_schema.sql（从目标数据库 SHOW CREATE TABLE 导出）
 * 本文件包含被 Drizzle ORM 构建器实际消费的表定义。
 * 新增 ORM 消费表时，从 SQL DDL 对应翻译并在此追加。
 *
 * 覆盖范围：35 张核心业务表（仓库 8 + 销售 5 + 采购 4 + 财务 2 + 生产 1 + 正式工单 3 + 报价 2 + 工艺模板 3 + 打样 1 + 印前油墨 3 + 工装 3）
 * drizzle-kit 迁移路径已废弃（drizzle/ 目录已清理），ORM 查询构建器活跃使用中。
 */

import {
  mysqlTable,
  varchar,
  datetime,
  date,
  timestamp,
  decimal,
  int,
  bigint,
  tinyint,
  text,
  boolean,
  serial,
  index,
  uniqueIndex,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

// ==================== 仓库入库（ORM 消费） ====================

// 入库单主表
// 物料主数据表
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

// 库存批次表
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

// 入库订单主表 — 对齐 vnerpdacahng_schema.sql
export const invInboundOrders = mysqlTable(
  'inv_inbound_order',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    orderNo: varchar('order_no', { length: 50 }).notNull(),
    orderType: varchar('order_type', { length: 20 }).default('purchase'),
    warehouseId: bigint('warehouse_id', { mode: 'number', unsigned: true }).notNull(),
    warehouseCode: varchar('warehouse_code', { length: 50 }),
    warehouseName: varchar('warehouse_name', { length: 100 }),
    supplierId: int('supplier_id', { unsigned: true }),
    supplierName: varchar('supplier_name', { length: 100 }),
    operatorId: bigint('operator_id', { mode: 'number', unsigned: true }),
    operatorName: varchar('operator_name', { length: 50 }),
    poId: int('po_id', { unsigned: true }),
    poNo: varchar('po_no', { length: 50 }),
    grnType: varchar('grn_type', { length: 10 }).default('po'),
    totalAmount: decimal('total_amount', { precision: 18, scale: 4 }),
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

// 入库单明细 — 对齐 vnerpdacahng_schema.sql
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

// 仓库主数据
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
    deleted: boolean('deleted').default(false),
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

// 库存表
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
    deleted: boolean('deleted').default(false),
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

// 出库单主表
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

// 出库单明细
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
    batchNo: varchar('batch_no', { length: 50 }),
    remark: varchar('remark', { length: 255 }),
    deleted: boolean('deleted').default(false),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    orderIdx: index('idx_order').on(table.orderId),
    materialIdx: index('idx_material').on(table.materialId),
  })
);

// 调拨单主表
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
    deleted: boolean('deleted').default(false),
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

// 盘点单主表
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
    deleted: boolean('deleted').default(false),
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

// ==================== 销售模块 ====================

// 销售订单主表
export const salOrder = mysqlTable(
  'sal_order',
  {
    id: serial('id').primaryKey(),
    orderNo: varchar('order_no', { length: 50 }).notNull(),
    orderDate: date('order_date'),
    customerId: bigint('customer_id', { mode: 'number', unsigned: true }).notNull(),
    contactName: varchar('contact_name', { length: 50 }),
    contactPhone: varchar('contact_phone', { length: 20 }),
    deliveryAddress: varchar('delivery_address', { length: 255 }),
    salesmanId: bigint('salesman_id', { mode: 'number', unsigned: true }),
    totalAmount: decimal('total_amount', { precision: 18, scale: 4 }).default('0.0000'),
    taxAmount: decimal('tax_amount', { precision: 18, scale: 4 }).default('0.0000'),
    totalWithTax: decimal('total_with_tax', { precision: 18, scale: 4 }).default('0.0000'),
    discountAmount: decimal('discount_amount', { precision: 18, scale: 4 }).default('0.0000'),
    currency: varchar('currency', { length: 10 }).default('CNY'),
    exchangeRate: decimal('exchange_rate', { precision: 18, scale: 4 }).default('1.0000'),
    paymentTerms: varchar('payment_terms', { length: 100 }),
    deliveryDate: date('delivery_date'),
    contractNo: varchar('contract_no', { length: 50 }),
    status: tinyint('status').default(1),
    remark: text('remark'),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    deleted: boolean('deleted').default(false),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    orderNoIdx: uniqueIndex('uk_order_no').on(table.orderNo),
    customerIdx: index('fk_sal_order_customer').on(table.customerId),
    salesmanIdx: index('fk_sal_order_salesman').on(table.salesmanId),
  })
);

// 销售订单明细
export const salOrderDetail = mysqlTable(
  'sal_order_detail',
  {
    id: serial('id').primaryKey(),
    orderId: bigint('order_id', { mode: 'number', unsigned: true }).notNull(),
    materialId: bigint('material_id', { mode: 'number', unsigned: true }).notNull(),
    materialName: varchar('material_name', { length: 100 }),
    quantity: decimal('quantity', { precision: 18, scale: 4 }).notNull(),
    unit: varchar('unit', { length: 20 }),
    unitPrice: decimal('unit_price', { precision: 18, scale: 4 }),
    taxRate: decimal('tax_rate', { precision: 18, scale: 4 }).default('0.0000'),
    amount: decimal('amount', { precision: 18, scale: 4 }),
    taxAmount: decimal('tax_amount', { precision: 18, scale: 4 }),
    totalAmount: decimal('total_amount', { precision: 18, scale: 4 }),
    deliveredQty: decimal('delivered_qty', { precision: 18, scale: 4 }).default('0.0000'),
    deliveryDate: date('delivery_date'),
    remark: varchar('remark', { length: 255 }),
    deleted: boolean('deleted').default(false),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    materialNameIdx: index('idx_material_name').on(table.materialName),
    orderIdx: index('fk_sal_order_detail_order').on(table.orderId),
    materialIdx: index('fk_sal_order_detail_material').on(table.materialId),
  })
);

// 销售出库单
export const salDelivery = mysqlTable(
  'sal_delivery',
  {
    id: serial('id').primaryKey(),
    deliveryNo: varchar('delivery_no', { length: 50 }).notNull(),
    deliveryDate: date('delivery_date'),
    orderId: bigint('order_id', { mode: 'number', unsigned: true }),
    orderNo: varchar('order_no', { length: 50 }),
    customerId: bigint('customer_id', { mode: 'number', unsigned: true }).notNull(),
    customerName: varchar('customer_name', { length: 100 }),
    warehouseId: bigint('warehouse_id', { mode: 'number', unsigned: true }).notNull(),
    totalAmount: decimal('total_amount', { precision: 18, scale: 4 }).default('0.0000'),
    totalQty: decimal('total_qty', { precision: 18, scale: 4 }).default('0.0000'),
    logisticsCompany: varchar('logistics_company', { length: 100 }),
    trackingNo: varchar('tracking_no', { length: 50 }),
    contactName: varchar('contact_name', { length: 50 }),
    contactPhone: varchar('contact_phone', { length: 30 }),
    deliveryAddress: varchar('delivery_address', { length: 500 }),
    status: tinyint('status').default(1),
    remark: text('remark'),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    shipBy: bigint('ship_by', { mode: 'number', unsigned: true }),
    shipTime: datetime('ship_time'),
    signBy: bigint('sign_by', { mode: 'number', unsigned: true }),
    signTime: datetime('sign_time'),
    signStatus: tinyint('sign_status').default(0),
    deleted: boolean('deleted').default(false),
    version: int('version').default(0),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    deliveryNoIdx: uniqueIndex('uk_delivery_no').on(table.deliveryNo),
    orderIdx: index('idx_order').on(table.orderId),
    customerIdx: index('idx_customer').on(table.customerId),
    warehouseIdx: index('idx_warehouse').on(table.warehouseId),
  })
);

// 销售退货单
export const salReturnOrder = mysqlTable(
  'sal_return_order',
  {
    id: serial('id').primaryKey(),
    returnNo: varchar('return_no', { length: 50 }).notNull(),
    orderId: bigint('order_id', { mode: 'number', unsigned: true }),
    orderNo: varchar('order_no', { length: 50 }),
    deliveryId: bigint('delivery_id', { mode: 'number', unsigned: true }),
    deliveryNo: varchar('delivery_no', { length: 50 }),
    customerId: bigint('customer_id', { mode: 'number', unsigned: true }).notNull(),
    customerName: varchar('customer_name', { length: 100 }),
    returnDate: date('return_date'),
    returnType: tinyint('return_type').default(1),
    returnReason: text('return_reason'),
    totalQty: decimal('total_qty', { precision: 18, scale: 4 }).default('0.0000'),
    totalAmount: decimal('total_amount', { precision: 18, scale: 4 }).default('0.0000'),
    inspectionStatus: tinyint('inspection_status').default(0),
    inspectionResult: tinyint('inspection_result'),
    warehouseId: bigint('warehouse_id', { mode: 'number', unsigned: true }),
    inboundStatus: tinyint('inbound_status').default(0),
    status: tinyint('status').default(1),
    remark: text('remark'),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    deleted: boolean('deleted').default(false),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    returnNoIdx: uniqueIndex('uk_return_no').on(table.returnNo),
    orderIdx: index('idx_order').on(table.orderId),
    customerIdx: index('idx_customer').on(table.customerId),
    statusIdx: index('idx_status').on(table.status),
  })
);

// 销售对账单
export const salReconciliation = mysqlTable(
  'sal_reconciliation',
  {
    id: serial('id').primaryKey(),
    reconciliationNo: varchar('reconciliation_no', { length: 50 }).notNull(),
    customerId: bigint('customer_id', { mode: 'number', unsigned: true }).notNull(),
    customerName: varchar('customer_name', { length: 100 }),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    deliveryAmount: decimal('delivery_amount', { precision: 18, scale: 4 }).default('0.0000'),
    returnAmount: decimal('return_amount', { precision: 18, scale: 4 }).default('0.0000'),
    discountAmount: decimal('discount_amount', { precision: 18, scale: 4 }).default('0.0000'),
    netAmount: decimal('net_amount', { precision: 18, scale: 4 }).default('0.0000'),
    receivedAmount: decimal('received_amount', { precision: 18, scale: 4 }).default('0.0000'),
    balanceAmount: decimal('balance_amount', { precision: 18, scale: 4 }).default('0.0000'),
    confirmStatus: tinyint('confirm_status').default(0),
    confirmPerson: varchar('confirm_person', { length: 50 }),
    confirmTime: datetime('confirm_time'),
    confirmRemark: varchar('confirm_remark', { length: 255 }),
    status: tinyint('status').default(1),
    remark: text('remark'),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    deleted: boolean('deleted').default(false),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    reconciliationNoIdx: uniqueIndex('uk_reconciliation_no').on(table.reconciliationNo),
    customerIdx: index('idx_customer').on(table.customerId),
    periodIdx: index('idx_period').on(table.periodStart, table.periodEnd),
    statusIdx: index('idx_status').on(table.status),
  })
);

// ==================== 采购模块 ====================

// 采购订单主表
export const purPurchaseOrder = mysqlTable(
  'pur_purchase_order',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    poNo: varchar('po_no', { length: 50 }).notNull(),
    supplierId: bigint('supplier_id', { mode: 'number', unsigned: true }),
    supplierName: varchar('supplier_name', { length: 100 }).notNull(),
    supplierCode: varchar('supplier_code', { length: 50 }),
    orderDate: date('order_date').notNull(),
    deliveryDate: date('delivery_date'),
    currency: varchar('currency', { length: 10 }).default('CNY'),
    exchangeRate: decimal('exchange_rate', { precision: 18, scale: 4 }).default('1.0000'),
    totalAmount: decimal('total_amount', { precision: 18, scale: 4 }).default('0.0000'),
    totalQuantity: decimal('total_quantity', { precision: 18, scale: 4 }).default('0.0000'),
    taxRate: decimal('tax_rate', { precision: 18, scale: 4 }).default('13.0000'),
    taxAmount: decimal('tax_amount', { precision: 18, scale: 4 }).default('0.0000'),
    grandTotal: decimal('grand_total', { precision: 18, scale: 4 }).default('0.0000'),
    status: int('status', { unsigned: true }).default(10),
    overReceiptTolerance: decimal('over_receipt_tolerance', { precision: 18, scale: 4 }).default(
      '5.0000'
    ),
    paymentTerms: varchar('payment_terms', { length: 100 }),
    deliveryAddress: text('delivery_address'),
    contactPerson: varchar('contact_person', { length: 50 }),
    contactPhone: varchar('contact_phone', { length: 50 }),
    remark: text('remark'),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    auditBy: bigint('audit_by', { mode: 'number', unsigned: true }),
    auditTime: datetime('audit_time'),
    closeBy: bigint('close_by', { mode: 'number', unsigned: true }),
    closeTime: datetime('close_time'),
    closeReason: varchar('close_reason', { length: 200 }),
    deleted: boolean('deleted').default(false),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    poNoIdx: uniqueIndex('uk_po_no').on(table.poNo),
    supplierIdx: index('idx_supplier').on(table.supplierId),
    statusIdx: index('idx_status').on(table.status),
    orderDateIdx: index('idx_order_date').on(table.orderDate),
  })
);

// 采购订单行
export const purPurchaseOrderLine = mysqlTable(
  'pur_purchase_order_line',
  {
    id: serial('id').primaryKey(),
    poId: bigint('po_id', { mode: 'number', unsigned: true }).notNull(),
    lineNo: int('line_no', { unsigned: true }).notNull(),
    materialId: bigint('material_id', { mode: 'number', unsigned: true }),
    materialCode: varchar('material_code', { length: 50 }).notNull(),
    materialName: varchar('material_name', { length: 200 }).notNull(),
    materialSpec: varchar('material_spec', { length: 500 }),
    unit: varchar('unit', { length: 20 }).default('件'),
    orderQty: decimal('order_qty', { precision: 18, scale: 4 }).notNull().default('0.0000'),
    receivedQty: decimal('received_qty', { precision: 18, scale: 4 }).default('0.0000'),
    returnedQty: decimal('returned_qty', { precision: 18, scale: 4 }).default('0.0000'),
    unitPrice: decimal('unit_price', { precision: 18, scale: 4 }).notNull().default('0.0000'),
    amount: decimal('amount', { precision: 18, scale: 4 }).default('0.0000'),
    taxRate: decimal('tax_rate', { precision: 18, scale: 4 }).default('13.0000'),
    taxAmount: decimal('tax_amount', { precision: 18, scale: 4 }).default('0.0000'),
    lineTotal: decimal('line_total', { precision: 18, scale: 4 }).default('0.0000'),
    requireDate: date('require_date'),
    closedFlag: boolean('closed_flag').default(false),
    closedReason: varchar('closed_reason', { length: 200 }),
    remark: text('remark'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    poLineIdx: uniqueIndex('uk_po_line').on(table.poId, table.lineNo),
    materialIdx: index('idx_material').on(table.materialId),
  })
);

// 采购退货单
export const purPurchaseReturn = mysqlTable(
  'pur_purchase_return',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    returnNo: varchar('return_no', { length: 32 }).notNull(),
    status: tinyint('status').notNull().default(1),
    orderId: bigint('order_id', { mode: 'number', unsigned: true }).notNull(),
    orderNo: varchar('order_no', { length: 32 }).notNull().default(''),
    supplierId: bigint('supplier_id', { mode: 'number', unsigned: true }).notNull(),
    supplierName: varchar('supplier_name', { length: 128 }).notNull().default(''),
    warehouseId: bigint('warehouse_id', { mode: 'number', unsigned: true }).notNull(),
    receiptId: bigint('receipt_id', { mode: 'number', unsigned: true }),
    receiptNo: varchar('receipt_no', { length: 32 }).notNull().default(''),
    reason: varchar('reason', { length: 512 }).notNull(),
    returnDate: date('return_date').notNull(),
    totalAmount: decimal('total_amount', { precision: 18, scale: 4 }).notNull().default('0.00'),
    approveBy: bigint('approve_by', { mode: 'number', unsigned: true }),
    approveTime: datetime('approve_time'),
    completeBy: bigint('complete_by', { mode: 'number', unsigned: true }),
    completeTime: datetime('complete_time'),
    outboundOrderId: bigint('outbound_order_id', { mode: 'number', unsigned: true }),
    outboundOrderNo: varchar('outbound_order_no', { length: 32 }),
    payableId: bigint('payable_id', { mode: 'number', unsigned: true }),
    payableNo: varchar('payable_no', { length: 32 }),
    remark: varchar('remark', { length: 512 }).notNull().default(''),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    deleted: boolean('deleted').default(false),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    returnNoIdx: uniqueIndex('uk_return_no').on(table.returnNo),
    orderIdx: index('idx_order_id').on(table.orderId),
    supplierIdx: index('idx_supplier_id').on(table.supplierId),
    statusIdx: index('idx_status').on(table.status),
    returnDateIdx: index('idx_return_date').on(table.returnDate),
  })
);

// 采购对账单
export const purPurchaseReconciliation = mysqlTable(
  'pur_purchase_reconciliation',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    reconciliationNo: varchar('reconciliation_no', { length: 32 }).notNull(),
    status: tinyint('status').notNull().default(1),
    supplierId: bigint('supplier_id', { mode: 'number', unsigned: true }).notNull(),
    supplierName: varchar('supplier_name', { length: 128 }).notNull().default(''),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    receiptAmount: decimal('receipt_amount', { precision: 18, scale: 4 }).notNull().default('0.00'),
    returnAmount: decimal('return_amount', { precision: 18, scale: 4 }).notNull().default('0.00'),
    netAmount: decimal('net_amount', { precision: 18, scale: 4 }).notNull().default('0.00'),
    discountAmount: decimal('discount_amount', { precision: 18, scale: 4 })
      .notNull()
      .default('0.00'),
    paidAmount: decimal('paid_amount', { precision: 18, scale: 4 }).notNull().default('0.00'),
    balanceAmount: decimal('balance_amount', { precision: 18, scale: 4 }).notNull().default('0.00'),
    remark: varchar('remark', { length: 512 }).notNull().default(''),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    confirmBy: bigint('confirm_by', { mode: 'number', unsigned: true }),
    confirmTime: datetime('confirm_time'),
    closeBy: bigint('close_by', { mode: 'number', unsigned: true }),
    closeTime: datetime('close_time'),
    deleted: boolean('deleted').default(false),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    reconciliationNoIdx: uniqueIndex('uk_reconciliation_no').on(table.reconciliationNo),
    supplierIdx: index('idx_supplier_id').on(table.supplierId),
    statusIdx: index('idx_status').on(table.status),
    periodIdx: index('idx_period').on(table.periodStart, table.periodEnd),
  })
);

// ==================== 财务模块 ====================

// 应收账款
export const finReceivable = mysqlTable(
  'fin_receivable',
  {
    id: serial('id').primaryKey(),
    receivableNo: varchar('receivable_no', { length: 50 }).notNull(),
    sourceType: tinyint('source_type').default(1),
    sourceNo: varchar('source_no', { length: 50 }),
    customerId: bigint('customer_id', { mode: 'number', unsigned: true }),
    amount: decimal('amount', { precision: 18, scale: 4 }).default('0.0000'),
    receivedAmount: decimal('received_amount', { precision: 18, scale: 4 }).default('0.0000'),
    balance: decimal('balance', { precision: 18, scale: 4 }).default('0.0000'),
    dueDate: date('due_date'),
    status: tinyint('status').default(1),
    remark: text('remark'),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    deleted: tinyint('deleted').default(0),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    receivableNoIdx: uniqueIndex('uk_receivable_no').on(table.receivableNo),
    customerIdx: index('idx_customer').on(table.customerId),
    sourceIdx: index('idx_source').on(table.sourceNo),
    statusIdx: index('idx_status').on(table.status),
  })
);

// 应付账款
export const finPayable = mysqlTable(
  'fin_payable',
  {
    id: serial('id').primaryKey(),
    payableNo: varchar('payable_no', { length: 50 }).notNull(),
    sourceType: tinyint('source_type').default(1),
    sourceNo: varchar('source_no', { length: 50 }),
    supplierId: bigint('supplier_id', { mode: 'number', unsigned: true }),
    amount: decimal('amount', { precision: 18, scale: 4 }).default('0.0000'),
    paidAmount: decimal('paid_amount', { precision: 18, scale: 4 }).default('0.0000'),
    balance: decimal('balance', { precision: 18, scale: 4 }).default('0.0000'),
    dueDate: date('due_date'),
    status: tinyint('status').default(1),
    remark: text('remark'),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    deleted: tinyint('deleted').default(0),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    payableNoIdx: uniqueIndex('uk_payable_no').on(table.payableNo),
    supplierIdx: index('idx_supplier').on(table.supplierId),
    sourceIdx: index('idx_source').on(table.sourceNo),
    statusIdx: index('idx_status').on(table.status),
  })
);

// ==================== 生产模块 ====================

// 生产工单
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
    deleted: boolean('deleted').default(false),
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

// ==================== 正式生产工单（prod_work_order 系列） ====================

// 正式生产工单主表 — 与 DB schema.sql L2716 对齐
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

// 正式生产工单 BOM 明细
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

// 正式生产工单物料需求
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

// ==================== 报价单（sal_quote 系列，migration 052） ====================

// 报价单主表
export const salQuote = mysqlTable(
  'sal_quote',
  {
    id: serial('id').primaryKey(),
    quoteNo: varchar('quote_no', { length: 50 }).notNull(),
    quoteDate: date('quote_date').notNull(),
    customerId: bigint('customer_id', { mode: 'number', unsigned: true }),
    customerName: varchar('customer_name', { length: 100 }),
    sampleCardId: bigint('sample_card_id', { mode: 'number', unsigned: true }),
    sampleNo: varchar('sample_no', { length: 50 }),
    productName: varchar('product_name', { length: 200 }),
    quantity: int('quantity').notNull().default(1),
    unit: varchar('unit', { length: 20 }).default('pcs'),
    materialCost: decimal('material_cost', { precision: 18, scale: 4 }).default('0.0000'),
    laborCost: decimal('labor_cost', { precision: 18, scale: 4 }).default('0.0000'),
    toolCost: decimal('tool_cost', { precision: 18, scale: 4 }).default('0.0000'),
    totalCost: decimal('total_cost', { precision: 18, scale: 4 }).default('0.0000'),
    markupRate: decimal('markup_rate', { precision: 5, scale: 2 }).default('30.00'),
    quotedPrice: decimal('quoted_price', { precision: 18, scale: 4 }).default('0.0000'),
    currency: varchar('currency', { length: 10 }).default('CNY'),
    status: tinyint('status').default(1),
    validUntil: date('valid_until'),
    remark: text('remark'),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: boolean('deleted').default(false),
  },
  (table) => ({
    quoteNoIdx: uniqueIndex('uk_sal_quote_no').on(table.quoteNo),
    customerIdx: index('idx_sal_quote_customer').on(table.customerId),
    sampleCardIdx: index('idx_sal_quote_sample_card').on(table.sampleCardId),
  })
);

// 报价单明细
export const salQuoteItem = mysqlTable(
  'sal_quote_item',
  {
    id: serial('id').primaryKey(),
    quoteId: bigint('quote_id', { mode: 'number', unsigned: true }).notNull(),
    lineNo: int('line_no').notNull().default(1),
    itemName: varchar('item_name', { length: 200 }).notNull(),
    quantity: decimal('quantity', { precision: 18, scale: 4 }).notNull().default('1.0000'),
    unit: varchar('unit', { length: 20 }).default('pcs'),
    unitCost: decimal('unit_cost', { precision: 18, scale: 4 }).default('0.0000'),
    unitPrice: decimal('unit_price', { precision: 18, scale: 4 }).default('0.0000'),
    totalPrice: decimal('total_price', { precision: 18, scale: 4 }).default('0.0000'),
    remark: varchar('remark', { length: 255 }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    quoteIdIdx: index('idx_sal_quote_item_quote').on(table.quoteId),
  })
);

// ==================== 打样工艺模板（dcprint_sample_process_template 系列，migration 051） ====================

// 模板主表
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
    deleted: boolean('deleted').default(false),
  },
  (table) => ({
    templateNoIdx: uniqueIndex('uk_spt_template_no').on(table.templateNo),
    categoryIdx: index('idx_spt_category').on(table.category),
    customerIdx: index('idx_spt_customer').on(table.customerId),
  })
);

// 模板物料明细
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

// 模板工序明细
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

// ==================== 生产排产 ====================

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

// ==================== 印前油墨配方（ORM 消费） ====================

// 油墨色号基础档案表
export const dcprintInkColor = mysqlTable(
  'dcprint_ink_color',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
    colorCode: varchar('color_code', { length: 50 }).notNull(),
    colorName: varchar('color_name', { length: 100 }).notNull(),
    colorSeries: varchar('color_series', { length: 50 }),
    baseInkType: varchar('base_ink_type', { length: 50 }),
    pantoneCode: varchar('pantone_code', { length: 50 }),
    remark: text('remark'),
    status: tinyint('status').default(1),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    colorCodeIdx: uniqueIndex('uk_color_code').on(table.colorCode),
    statusIdx: index('idx_ink_color_status').on(table.status),
  })
);

// 油墨配方版本主表
export const dcprintInkFormulaVersion = mysqlTable(
  'dcprint_ink_formula_version',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
    colorId: bigint('color_id', { mode: 'number', unsigned: true }).notNull(),
    versionNo: varchar('version_no', { length: 20 }).notNull(),
    versionName: varchar('version_name', { length: 100 }),
    status: tinyint('status').default(1),
    changeReason: text('change_reason'),
    sourceVersionId: bigint('source_version_id', { mode: 'number', unsigned: true }),
    processNote: text('process_note'),
    totalWeight: decimal('total_weight', { precision: 10, scale: 3 }),
    unit: varchar('unit', { length: 10 }).default('kg'),
    shelfLifeHours: int('shelf_life_hours').default(168),
    theoreticalCost: decimal('theoretical_cost', { precision: 12, scale: 4 }),
    costSnapshotTime: datetime('cost_snapshot_time'),
    costCalcStatus: tinyint('cost_calc_status').default(0),
    costWarning: varchar('cost_warning', { length: 255 }),
    activateBy: bigint('activate_by', { mode: 'number', unsigned: true }),
    activateTime: datetime('activate_time'),
    cancelBy: bigint('cancel_by', { mode: 'number', unsigned: true }),
    cancelReason: text('cancel_reason'),
    cancelTime: datetime('cancel_time'),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    colorIdIdx: index('idx_formula_color').on(table.colorId),
    versionNoIdx: index('idx_formula_version_no').on(table.versionNo),
    statusIdx: index('idx_formula_status').on(table.status),
    colorVersionUk: uniqueIndex('uk_color_version').on(table.colorId, table.versionNo),
  })
);

// 油墨配方明细表
export const dcprintInkFormulaItem = mysqlTable(
  'dcprint_ink_formula_item',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
    versionId: bigint('version_id', { mode: 'number', unsigned: true }).notNull(),
    materialId: bigint('material_id', { mode: 'number', unsigned: true }),
    materialCode: varchar('material_code', { length: 50 }).notNull(),
    materialName: varchar('material_name', { length: 100 }).notNull(),
    inkType: varchar('ink_type', { length: 20 }),
    brand: varchar('brand', { length: 100 }),
    ratio: decimal('ratio', { precision: 8, scale: 4 }).default('0'),
    weight: decimal('weight', { precision: 10, scale: 3 }),
    unit: varchar('unit', { length: 10 }).default('kg'),
    addOrder: int('add_order').default(0),
    processRemark: varchar('process_remark', { length: 255 }),
    sort: int('sort').default(0),
    isBase: tinyint('is_base').default(0),
    snapshotUnitCost: decimal('snapshot_unit_cost', { precision: 12, scale: 4 }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    versionIdIdx: index('idx_item_version').on(table.versionId),
  })
);

// ==================== 刀模/网版寿命追踪（ORM 消费） ====================

// 工装主表（统一管理刀模+网版）
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

// 工装使用记录表
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

// 工装维修记录表
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

// ==================== 生产核心流程表（prd_ 系列，migration 054） ====================

// 生产领料单主表
export const prdPickOrder = mysqlTable(
  'prd_pick_order',
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

// 生产领料单明细
export const prdPickOrderItem = mysqlTable(
  'prd_pick_order_item',
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

// 生产退料单主表
export const prdReturnOrder = mysqlTable(
  'prd_return_order',
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

// 生产退料单明细
export const prdReturnOrderItem = mysqlTable(
  'prd_return_order_item',
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

// 工序报工单
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

// 完工入库单
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

// ==================== 生产基础资料表（prd_ 系列，Schema 对齐补全） ====================

// 标准卡主表 (prd_standard_card)
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

// 产品标签表 (prd_product_label)
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

// BOM表 (prd_bom)
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

// BOM明细表 (prd_bom_detail)
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

// 标准BOM头 (prd_bom_std)
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

// 标准BOM行 (prd_bom_line_std)
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

// 刀模/工装主表 (prd_die)
export const prdDie = mysqlTable(
  'prd_die',
  {
    id: serial('id').primaryKey(),
    dieCode: varchar('die_code', { length: 50 }).notNull(),
    dieName: varchar('die_name', { length: 100 }),
    dieType: varchar('die_type', { length: 50 }),
    sizeSpec: varchar('size_spec', { length: 100 }),
    customerId: int('customer_id'),
    productName: varchar('product_name', { length: 200 }),
    maxUseCount: int('max_use_count').default(0),
    usedCount: int('used_count').default(0),
    remainingCount: int('remaining_count').default(0),
    maintenanceDays: int('maintenance_days').default(180),
    lastMaintenanceDate: date('last_maintenance_date'),
    nextMaintenanceDate: date('next_maintenance_date'),
    warehouseId: int('warehouse_id'),
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

// 刀模板/网版管理表 (prd_die_template)
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

// 油墨管理表 (prd_ink)
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
    supplierId: int('supplier_id'),
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

// 丝网版管理表 (prd_screen_plate)
export const prdScreenPlate = mysqlTable(
  'prd_screen_plate',
  {
    id: serial('id').primaryKey(),
    plateCode: varchar('plate_code', { length: 50 }).notNull(),
    plateName: varchar('plate_name', { length: 100 }),
    plateType: varchar('plate_type', { length: 50 }),
    meshCount: varchar('mesh_count', { length: 50 }),
    sizeSpec: varchar('size_spec', { length: 100 }),
    customerId: int('customer_id'),
    productName: varchar('product_name', { length: 200 }),
    maxUseCount: int('max_use_count').default(0),
    usedCount: int('used_count').default(0),
    remainingCount: int('remaining_count').default(0),
    maintenanceDays: int('maintenance_days').default(360),
    lastMaintenanceDate: date('last_maintenance_date'),
    nextMaintenanceDate: date('next_maintenance_date'),
    warehouseId: int('warehouse_id'),
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

// 生产流程卡表 (prd_process_card)
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

// 流程卡物料关联表 (prd_process_card_material)
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

// 工艺路线表 (prd_process_route)
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

// 工艺路线工序表 (prd_process_route_step)
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

// 工单色序表 (prd_work_order_color_seq)
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

// ==================== 打样工艺卡（dcprint_sample_process_card，migration 049） ====================

// 打样工艺卡主表
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

// 工艺卡物料明细表
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

// 工艺卡工序明细表
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

// ==================== 工单 BOM 表（prd_work_order_bom） ====================

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

// ==================== 打样模块表 ====================

// 打样单主表
export const sampleOrder = mysqlTable(
  'sample_order',
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

// 打样反馈表
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

// 打样报价表
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

// ==================== 类型导出 ====================

// 仓库入库
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

// 销售
export type SalOrder = typeof salOrder.$inferSelect;
export type SalOrderDetail = typeof salOrderDetail.$inferSelect;
export type SalDelivery = typeof salDelivery.$inferSelect;
export type SalReturnOrder = typeof salReturnOrder.$inferSelect;
export type SalReconciliation = typeof salReconciliation.$inferSelect;

// 采购
export type PurPurchaseOrder = typeof purPurchaseOrder.$inferSelect;
export type PurPurchaseOrderLine = typeof purPurchaseOrderLine.$inferSelect;
export type PurPurchaseReturn = typeof purPurchaseReturn.$inferSelect;
export type PurPurchaseReconciliation = typeof purPurchaseReconciliation.$inferSelect;

// 财务
export type FinReceivable = typeof finReceivable.$inferSelect;
export type FinPayable = typeof finPayable.$inferSelect;

// 生产
export type PrdWorkOrder = typeof prdWorkOrder.$inferSelect;
export type ProdWorkOrder = typeof prodWorkOrder.$inferSelect;
export type ProdWorkOrderItem = typeof prodWorkOrderItem.$inferSelect;
export type ProdWorkOrderMaterialReq = typeof prodWorkOrderMaterialReq.$inferSelect;

// 生产核心流程
export type PrdPickOrder = typeof prdPickOrder.$inferSelect;
export type PrdPickOrderItem = typeof prdPickOrderItem.$inferSelect;
export type PrdReturnOrder = typeof prdReturnOrder.$inferSelect;
export type PrdReturnOrderItem = typeof prdReturnOrderItem.$inferSelect;
export type PrdWorkReport = typeof prdWorkReport.$inferSelect;
export type PrdFinishOrder = typeof prdFinishOrder.$inferSelect;

// 生产排产
export type PrdSchedule = typeof prdSchedule.$inferSelect;
export type PrdScheduleDetail = typeof prdScheduleDetail.$inferSelect;

// 报价单
export type SalQuote = typeof salQuote.$inferSelect;
export type SalQuoteItem = typeof salQuoteItem.$inferSelect;

// 打样工艺模板
export type SampleProcessTemplate = typeof sampleProcessTemplate.$inferSelect;
export type SampleProcessTemplateItem = typeof sampleProcessTemplateItem.$inferSelect;
export type SampleProcessTemplateStep = typeof sampleProcessTemplateStep.$inferSelect;

// 印前油墨配方
export type DcprintInkColor = typeof dcprintInkColor.$inferSelect;
export type DcprintInkFormulaVersion = typeof dcprintInkFormulaVersion.$inferSelect;
export type DcprintInkFormulaItem = typeof dcprintInkFormulaItem.$inferSelect;

// 刀模/网版寿命追踪
export type DcprintTool = typeof dcprintTool.$inferSelect;
export type DcprintToolUsage = typeof dcprintToolUsage.$inferSelect;
export type DcprintToolMaintenance = typeof dcprintToolMaintenance.$inferSelect;

// 打样工艺卡
export type DcprintSampleProcessCard = typeof dcprintSampleProcessCard.$inferSelect;
export type DcprintSampleProcessItem = typeof dcprintSampleProcessItem.$inferSelect;
export type DcprintSampleProcessStep = typeof dcprintSampleProcessStep.$inferSelect;

// 工单 BOM
export type PrdWorkOrderBom = typeof prdWorkOrderBom.$inferSelect;

// 生产基础资料（Schema 对齐补全）
export type PrdStandardCard = typeof prdStandardCard.$inferSelect;
export type PrdProductLabel = typeof prdProductLabel.$inferSelect;
export type PrdBom = typeof prdBom.$inferSelect;
export type PrdBomDetail = typeof prdBomDetail.$inferSelect;
export type PrdBomStd = typeof prdBomStd.$inferSelect;
export type PrdBomLineStd = typeof prdBomLineStd.$inferSelect;
export type PrdDie = typeof prdDie.$inferSelect;
export type PrdDieTemplate = typeof prdDieTemplate.$inferSelect;
export type PrdInk = typeof prdInk.$inferSelect;
export type PrdScreenPlate = typeof prdScreenPlate.$inferSelect;
export type PrdProcessCard = typeof prdProcessCard.$inferSelect;
export type PrdProcessCardMaterial = typeof prdProcessCardMaterial.$inferSelect;
export type PrdProcessRoute = typeof prdProcessRoute.$inferSelect;
export type PrdProcessRouteStep = typeof prdProcessRouteStep.$inferSelect;
export type PrdWorkOrderColorSeq = typeof prdWorkOrderColorSeq.$inferSelect;

// 打样模块
export type SampleOrder = typeof sampleOrder.$inferSelect;
export type SalSampleFeedback = typeof salSampleFeedback.$inferSelect;
export type SalSampleQuotation = typeof salSampleQuotation.$inferSelect;
