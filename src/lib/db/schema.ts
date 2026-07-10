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
export const invInboundOrders = mysqlTable(
  'inv_inbound_order',
  {
    id: serial('id').primaryKey(),
    orderNo: varchar('order_no', { length: 30 }).notNull(),
    orderType: varchar('order_type', { length: 20 }).default('purchase'),
    warehouseId: int('warehouse_id').notNull(),
    supplierId: int('supplier_id'),
    supplierName: varchar('supplier_name', { length: 100 }),
    poId: int('po_id'),
    poNo: varchar('po_no', { length: 50 }),
    inboundDate: datetime('inbound_date'),
    totalQuantity: decimal('total_quantity', { precision: 15, scale: 3 }).default('0'),
    totalAmount: decimal('total_amount', { precision: 15, scale: 2 }),
    status: varchar('status', { length: 20 }).default('pending'),
    qcStatus: varchar('qc_status', { length: 20 }).default('pending'),
    remark: varchar('remark', { length: 500 }),
    deleted: boolean('deleted').default(false),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    orderNoIdx: index('idx_order_no').on(table.orderNo),
    statusIdx: index('idx_status').on(table.status),
    warehouseIdx: index('idx_warehouse').on(table.warehouseId),
    inboundDateIdx: index('idx_inbound_date').on(table.inboundDate),
  })
);

// 入库单明细
export const invInboundItems = mysqlTable(
  'inv_inbound_item',
  {
    id: serial('id').primaryKey(),
    orderId: bigint('order_id', { mode: 'number', unsigned: true }).notNull(),
    materialId: bigint('material_id', { mode: 'number', unsigned: true }),
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
    deleted: boolean('deleted').default(false),
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
    orderId: bigint('order_id', { mode: 'number' }).notNull(),
    orderNo: varchar('order_no', { length: 32 }).notNull().default(''),
    supplierId: bigint('supplier_id', { mode: 'number' }).notNull(),
    supplierName: varchar('supplier_name', { length: 128 }).notNull().default(''),
    warehouseId: bigint('warehouse_id', { mode: 'number' }).notNull(),
    receiptId: bigint('receipt_id', { mode: 'number' }),
    receiptNo: varchar('receipt_no', { length: 32 }).notNull().default(''),
    reason: varchar('reason', { length: 512 }).notNull(),
    returnDate: date('return_date').notNull(),
    totalAmount: decimal('total_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    approveBy: bigint('approve_by', { mode: 'number' }),
    approveTime: datetime('approve_time'),
    completeBy: bigint('complete_by', { mode: 'number' }),
    completeTime: datetime('complete_time'),
    outboundOrderId: bigint('outbound_order_id', { mode: 'number' }),
    outboundOrderNo: varchar('outbound_order_no', { length: 32 }),
    payableId: bigint('payable_id', { mode: 'number' }),
    payableNo: varchar('payable_no', { length: 32 }),
    remark: varchar('remark', { length: 512 }).notNull().default(''),
    createBy: bigint('create_by', { mode: 'number' }),
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
    supplierId: bigint('supplier_id', { mode: 'number' }).notNull(),
    supplierName: varchar('supplier_name', { length: 128 }).notNull().default(''),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    receiptAmount: decimal('receipt_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    returnAmount: decimal('return_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    netAmount: decimal('net_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    discountAmount: decimal('discount_amount', { precision: 14, scale: 2 })
      .notNull()
      .default('0.00'),
    paidAmount: decimal('paid_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    balanceAmount: decimal('balance_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    remark: varchar('remark', { length: 512 }).notNull().default(''),
    createBy: bigint('create_by', { mode: 'number' }),
    confirmBy: bigint('confirm_by', { mode: 'number' }),
    confirmTime: datetime('confirm_time'),
    closeBy: bigint('close_by', { mode: 'number' }),
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
    deleted: boolean('deleted').default(false),
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
    deleted: boolean('deleted').default(false),
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
    quantity: decimal('quantity', { precision: 15, scale: 2 }).default('0.00'),
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
    pickedQty: decimal('picked_qty', { precision: 10, scale: 2 }).default('0.00'),
    finishedQty: decimal('finished_qty', { precision: 10, scale: 2 }).default('0.00'),
    returnedQty: decimal('returned_qty', { precision: 10, scale: 2 }).default('0.00'),
    totalMaterialCost: decimal('total_material_cost', { precision: 12, scale: 2 }).default('0.00'),
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
    unitPrice: decimal('unit_price', { precision: 12, scale: 4 }).default('0.0000'),
    totalPrice: decimal('total_price', { precision: 12, scale: 4 }).default('0.0000'),
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
    materialCost: decimal('material_cost', { precision: 12, scale: 4 }).default('0.0000'),
    laborCost: decimal('labor_cost', { precision: 12, scale: 4 }).default('0.0000'),
    toolCost: decimal('tool_cost', { precision: 12, scale: 4 }).default('0.0000'),
    totalCost: decimal('total_cost', { precision: 12, scale: 4 }).default('0.0000'),
    markupRate: decimal('markup_rate', { precision: 5, scale: 2 }).default('30.00'),
    quotedPrice: decimal('quoted_price', { precision: 12, scale: 4 }).default('0.0000'),
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
    quantity: decimal('quantity', { precision: 10, scale: 4 }).notNull().default('1.0000'),
    unit: varchar('unit', { length: 20 }).default('pcs'),
    unitCost: decimal('unit_cost', { precision: 12, scale: 4 }).default('0.0000'),
    unitPrice: decimal('unit_price', { precision: 12, scale: 4 }).default('0.0000'),
    totalPrice: decimal('total_price', { precision: 12, scale: 4 }).default('0.0000'),
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
    unitDosage: decimal('unit_dosage', { precision: 10, scale: 4 }).notNull(),
    unit: varchar('unit', { length: 20 }),
    unitCost: decimal('unit_cost', { precision: 12, scale: 4 }).default('0.0000'),
    lineCost: decimal('line_cost', { precision: 12, scale: 4 }).default('0.0000'),
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
    originalCost: decimal('original_cost', { precision: 10, scale: 2 }).notNull(),
    accumulatedCost: decimal('accumulated_cost', { precision: 10, scale: 2 }).default('0'),
    netValue: decimal('net_value', { precision: 10, scale: 2 }).notNull(),
    unitCost: decimal('unit_cost', { precision: 10, scale: 4 }).notNull(),
    status: tinyint('status').default(1), // 1=待用 2=在用 3=维修中 4=预警 5=已报废
    manufactureDate: date('manufacture_date'),
    warehouseLocation: varchar('warehouse_location', { length: 100 }),
    scrapReason: text('scrap_reason'),
    scrapTime: datetime('scrap_time'),
    scrapBy: bigint('scrap_by', { mode: 'number', unsigned: true }),
    remark: text('remark'),
    isDeleted: tinyint('is_deleted').default(0),
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

// ==================== 类型导出 ====================

// 仓库入库
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
