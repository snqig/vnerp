import { bigint, date, datetime, decimal, index, int, mysqlTable, serial, text, tinyint, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
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
    baseTotalAmount: decimal('base_total_amount', { precision: 18, scale: 4 }).default('0.0000'),
    baseTaxAmount: decimal('base_tax_amount', { precision: 18, scale: 4 }).default('0.0000'),
    baseGrandTotal: decimal('base_grand_total', { precision: 18, scale: 4 }).default('0.0000'),
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
    deleted: tinyint('deleted').default(0),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    orderNoIdx: uniqueIndex('uk_order_no').on(table.orderNo),
    customerIdx: index('fk_sal_order_customer').on(table.customerId),
    salesmanIdx: index('fk_sal_order_salesman').on(table.salesmanId),
  })
);

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
    currency: varchar('currency', { length: 10 }).default('CNY'),
    exchangeRate: decimal('exchange_rate', { precision: 18, scale: 4 }).default('1.0000'),
    baseUnitPrice: decimal('base_unit_price', { precision: 18, scale: 4 }),
    baseAmount: decimal('base_amount', { precision: 18, scale: 4 }),
    baseTaxAmount: decimal('base_tax_amount', { precision: 18, scale: 4 }),
    deliveredQty: decimal('delivered_qty', { precision: 18, scale: 4 }).default('0.0000'),
    deliveryDate: date('delivery_date'),
    remark: varchar('remark', { length: 255 }),
    deleted: tinyint('deleted').default(0),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    materialNameIdx: index('idx_material_name').on(table.materialName),
    orderIdx: index('fk_sal_order_detail_order').on(table.orderId),
    materialIdx: index('fk_sal_order_detail_material').on(table.materialId),
  })
);

export const salDelivery = mysqlTable(
  'sal_delivery_order',
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
    currency: varchar('currency', { length: 10 }).default('CNY'),
    exchangeRate: decimal('exchange_rate', { precision: 18, scale: 4 }).default('1.0000'),
    baseTotalAmount: decimal('base_total_amount', { precision: 18, scale: 4 }),
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
    deleted: tinyint('deleted').default(0),
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
    currency: varchar('currency', { length: 10 }).default('CNY'),
    exchangeRate: decimal('exchange_rate', { precision: 18, scale: 4 }).default('1.0000'),
    baseTotalAmount: decimal('base_total_amount', { precision: 18, scale: 4 }),
    inspectionStatus: tinyint('inspection_status').default(0),
    inspectionResult: tinyint('inspection_result'),
    warehouseId: bigint('warehouse_id', { mode: 'number', unsigned: true }),
    inboundStatus: tinyint('inbound_status').default(0),
    status: tinyint('status').default(1),
    remark: text('remark'),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    deleted: tinyint('deleted').default(0),
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
    currency: varchar('currency', { length: 10 }).default('CNY'),
    exchangeRate: decimal('exchange_rate', { precision: 18, scale: 4 }).default('1.0000'),
    baseDeliveryAmount: decimal('base_delivery_amount', { precision: 18, scale: 4 }).default(
      '0.0000'
    ),
    baseReturnAmount: decimal('base_return_amount', { precision: 18, scale: 4 }).default('0.0000'),
    baseNetAmount: decimal('base_net_amount', { precision: 18, scale: 4 }).default('0.0000'),
    baseDiscountAmount: decimal('base_discount_amount', { precision: 18, scale: 4 }).default(
      '0.0000'
    ),
    baseReceivedAmount: decimal('base_received_amount', { precision: 18, scale: 4 }).default(
      '0.0000'
    ),
    baseBalanceAmount: decimal('base_balance_amount', { precision: 18, scale: 4 }).default(
      '0.0000'
    ),
    confirmStatus: tinyint('confirm_status').default(0),
    confirmPerson: varchar('confirm_person', { length: 50 }),
    confirmTime: datetime('confirm_time'),
    confirmRemark: varchar('confirm_remark', { length: 255 }),
    status: tinyint('status').default(1),
    remark: text('remark'),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    deleted: tinyint('deleted').default(0),
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

export type SalOrder = typeof salOrder.$inferSelect;
export type SalOrderDetail = typeof salOrderDetail.$inferSelect;
export type SalDelivery = typeof salDelivery.$inferSelect;
export type SalReturnOrder = typeof salReturnOrder.$inferSelect;
export type SalReconciliation = typeof salReconciliation.$inferSelect;