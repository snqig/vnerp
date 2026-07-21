import { bigint, boolean, date, datetime, decimal, index, int, mysqlTable, serial, text, tinyint, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
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
    baseTotalAmount: decimal('base_total_amount', { precision: 18, scale: 4 })
      .default('0.0000')
      .notNull(),
    baseTaxAmount: decimal('base_tax_amount', { precision: 18, scale: 4 })
      .default('0.0000')
      .notNull(),
    baseGrandTotal: decimal('base_grand_total', { precision: 18, scale: 4 })
      .default('0.0000')
      .notNull(),
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
    deleted: tinyint('deleted').default(0),
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
    baseUnitPrice: decimal('base_unit_price', { precision: 18, scale: 4 })
      .default('0.0000')
      .notNull(),
    baseAmount: decimal('base_amount', { precision: 18, scale: 4 }).default('0.0000').notNull(),
    baseTaxAmount: decimal('base_tax_amount', { precision: 18, scale: 4 })
      .default('0.0000')
      .notNull(),
    baseLineTotal: decimal('base_line_total', { precision: 18, scale: 4 })
      .default('0.0000')
      .notNull(),
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
    currency: varchar('currency', { length: 10 }).default('CNY').notNull(),
    exchangeRate: decimal('exchange_rate', { precision: 18, scale: 4 }).default('1.0000').notNull(),
    baseTotalAmount: decimal('base_total_amount', { precision: 18, scale: 4 })
      .default('0.0000')
      .notNull(),
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
    deleted: tinyint('deleted').default(0),
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

export const purPurchaseReturnLine = mysqlTable(
  'pur_purchase_return_line',
  {
    id: serial('id').primaryKey(),
    returnId: bigint('return_id', { mode: 'number', unsigned: true }).notNull(),
    lineNo: int('line_no', { unsigned: true }).notNull(),
    orderLineId: bigint('order_line_id', { mode: 'number', unsigned: true }),
    materialId: bigint('material_id', { mode: 'number', unsigned: true }).notNull(),
    materialCode: varchar('material_code', { length: 50 }).notNull(),
    materialName: varchar('material_name', { length: 200 }).notNull(),
    materialSpec: varchar('material_spec', { length: 500 }),
    unit: varchar('unit', { length: 20 }).default('件'),
    quantity: decimal('quantity', { precision: 18, scale: 4 }).notNull().default('0.0000'),
    unitPrice: decimal('unit_price', { precision: 18, scale: 4 }).notNull().default('0.0000'),
    amount: decimal('amount', { precision: 18, scale: 4 }).default('0.0000'),
    baseUnitPrice: decimal('base_unit_price', { precision: 18, scale: 4 })
      .default('0.0000')
      .notNull(),
    baseAmount: decimal('base_amount', { precision: 18, scale: 4 }).default('0.0000').notNull(),
    batchNo: varchar('batch_no', { length: 100 }),
    reason: varchar('reason', { length: 512 }),
    remark: text('remark'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    returnLineIdx: uniqueIndex('uk_return_line').on(table.returnId, table.lineNo),
    materialIdx: index('idx_material').on(table.materialId),
  })
);

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
    currency: varchar('currency', { length: 10 }).default('CNY').notNull(),
    exchangeRate: decimal('exchange_rate', { precision: 18, scale: 4 }).default('1.0000').notNull(),
    baseReceiptAmount: decimal('base_receipt_amount', { precision: 18, scale: 4 })
      .default('0.0000')
      .notNull(),
    baseReturnAmount: decimal('base_return_amount', { precision: 18, scale: 4 })
      .default('0.0000')
      .notNull(),
    baseNetAmount: decimal('base_net_amount', { precision: 18, scale: 4 })
      .default('0.0000')
      .notNull(),
    baseDiscountAmount: decimal('base_discount_amount', { precision: 18, scale: 4 })
      .default('0.0000')
      .notNull(),
    basePaidAmount: decimal('base_paid_amount', { precision: 18, scale: 4 })
      .default('0.0000')
      .notNull(),
    baseBalanceAmount: decimal('base_balance_amount', { precision: 18, scale: 4 })
      .default('0.0000')
      .notNull(),
    remark: varchar('remark', { length: 512 }).notNull().default(''),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    confirmBy: bigint('confirm_by', { mode: 'number', unsigned: true }),
    confirmTime: datetime('confirm_time'),
    closeBy: bigint('close_by', { mode: 'number', unsigned: true }),
    closeTime: datetime('close_time'),
    deleted: tinyint('deleted').default(0),
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

export const purSupplier = mysqlTable(
  'pur_supplier',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    supplierCode: varchar('supplier_code', { length: 50 }).notNull(),
    defaultCurrency: varchar('default_currency', { length: 10 }).default('CNY'),
    supplierName: varchar('supplier_name', { length: 100 }).notNull(),
    shortName: varchar('short_name', { length: 50 }),
    supplierType: tinyint('supplier_type'),
    province: varchar('province', { length: 50 }),
    city: varchar('city', { length: 50 }),
    address: varchar('address', { length: 255 }),
    contactName: varchar('contact_name', { length: 50 }),
    contactPhone: varchar('contact_phone', { length: 20 }),
    contactEmail: varchar('contact_email', { length: 100 }),
    businessLicense: varchar('business_license', { length: 50 }),
    taxNumber: varchar('tax_number', { length: 50 }),
    bankName: varchar('bank_name', { length: 100 }),
    bankAccount: varchar('bank_account', { length: 50 }),
    creditLevel: varchar('credit_level', { length: 20 }),
    cooperationStatus: tinyint('cooperation_status').default(1),
    settlementMethod: varchar('settlement_method', { length: 50 }),
    paymentTerms: varchar('payment_terms', { length: 100 }),
    status: tinyint('status').default(1),
    remark: text('remark'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    supplierCodeIdx: uniqueIndex('uk_supplier_code').on(table.supplierCode),
    supplierNameIdx: index('idx_supplier_name').on(table.supplierName),
    statusIdx: index('idx_status').on(table.status),
  })
);

export type PurPurchaseOrder = typeof purPurchaseOrder.$inferSelect;
export type PurPurchaseOrderLine = typeof purPurchaseOrderLine.$inferSelect;
export type PurPurchaseReturn = typeof purPurchaseReturn.$inferSelect;
export type PurPurchaseReconciliation = typeof purPurchaseReconciliation.$inferSelect;