import { invMaterial } from './warehouse';
import { sysUser } from './system';
import { crmCustomer } from './_gen_crm';
import { foreignKey } from 'drizzle-orm/mysql-core';
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
    actualDeliveryDate: datetime('actual_delivery_date'), // 实际交付日期
    amount: decimal('amount', { precision: 18, scale: 2 }).default('0.00'),
    shippedQty: decimal('shipped_qty', { precision: 18, scale: 4 }).default('0.0000'), // 已发货数量
  },
  (table) => ({
    orderNoIdx: uniqueIndex('uk_order_no').on(table.orderNo),
    customerIdx: index('fk_sal_order_customer').on(table.customerId),
    salesmanIdx: index('fk_sal_order_salesman').on(table.salesmanId),
      fk_crmCustomer_customerId: foreignKey({
      name: 'fk_sal_order_customer',
      columns: [table.customerId],
      foreignColumns: [crmCustomer.id],
    })
      .onDelete('restrict')
      .onUpdate('cascade'),
    fk_sysUser_salesmanId: foreignKey({
      name: 'fk_sal_order_salesman',
      columns: [table.salesmanId],
      foreignColumns: [sysUser.id],
    })
      .onDelete('set null')
      .onUpdate('cascade'),
  })
);

export const salOrderDetail = mysqlTable(
  'sal_order_detail',
  {
    id: serial('id').primaryKey(),
    orderId: bigint('order_id', { mode: 'number', unsigned: true }).notNull(),
    materialId: bigint('material_id', { mode: 'number', unsigned: true }).notNull(),
    materialName: varchar('material_name', { length: 100 }),
    // 以下 4 列 2026-09-27 补建（原库里没有，但 MysqlSalesOrderRepository.ts:183-186 的
    // 手写 INSERT 一直在写它们，等于「写库必炸」）。补列时才被验证脚本逐个撞出来，
    // 故一并补上声明——否则走 Drizzle 写会静默丢列。
    materialCode: varchar('material_code', { length: 50 }),
    specification: varchar('specification', { length: 255 }),
    shippedQty: decimal('shipped_qty', { precision: 18, scale: 4 }).default('0.0000'),
    baseLineTotal: decimal('base_line_total', { precision: 18, scale: 4 }),
    quantity: decimal('quantity', { precision: 18, scale: 4 }).notNull(),
    unit: varchar('unit', { length: 20 }),
    unitPrice: decimal('unit_price', { precision: 18, scale: 4 }),
    taxRate: decimal('tax_rate', { precision: 18, scale: 4 }).default('0.0000'),
    amount: decimal('amount', { precision: 18, scale: 4 }),
    taxAmount: decimal('tax_amount', { precision: 18, scale: 4 }),
    totalAmount: decimal('total_amount', { precision: 18, scale: 4 }),
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
      fk_invMaterial_materialId: foreignKey({
      name: 'fk_sal_order_detail_material',
      columns: [table.materialId],
      foreignColumns: [invMaterial.id],
    })
      .onDelete('restrict')
      .onUpdate('cascade'),
    fk_salOrder_orderId: foreignKey({
      name: 'fk_sal_order_detail_order',
      columns: [table.orderId],
      foreignColumns: [salOrder.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
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
      fk_salOrder_orderId: foreignKey({
      name: 'fk_sal_return_order_order',
      columns: [table.orderId],
      foreignColumns: [salOrder.id],
    })
      .onDelete('restrict')
      .onUpdate('cascade'),
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
    // 本币六项：2026-09-27 补建。原库里没有，而 MysqlReconciliationRepository.ts:188-217
    // 的对账 INSERT 一直在写它们（写库必炸）。补列后补声明，避免 Drizzle 侧静默丢列。
    baseDeliveryAmount: decimal('base_delivery_amount', { precision: 18, scale: 4 }).default('0.0000'),
    baseReturnAmount: decimal('base_return_amount', { precision: 18, scale: 4 }).default('0.0000'),
    baseNetAmount: decimal('base_net_amount', { precision: 18, scale: 4 }).default('0.0000'),
    baseDiscountAmount: decimal('base_discount_amount', { precision: 18, scale: 4 }).default('0.0000'),
    baseReceivedAmount: decimal('base_received_amount', { precision: 18, scale: 4 }).default('0.0000'),
    baseBalanceAmount: decimal('base_balance_amount', { precision: 18, scale: 4 }).default('0.0000'),
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
      fk_crmCustomer_customerId: foreignKey({
      name: 'fk_sal_recon_customer',
      columns: [table.customerId],
      foreignColumns: [crmCustomer.id],
    })
      .onDelete('restrict')
      .onUpdate('cascade'),
  })
);

export type SalOrder = typeof salOrder.$inferSelect;
export type SalOrderDetail = typeof salOrderDetail.$inferSelect;
export type SalReturnOrder = typeof salReturnOrder.$inferSelect;
export type SalReconciliation = typeof salReconciliation.$inferSelect;