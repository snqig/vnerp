import { bigint, datetime, decimal, index, int, json, mysqlTable, text, tinyint, varchar } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const qrcodeRecord = mysqlTable('qrcode_record', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  qrCode: varchar('qr_code', { length: 100 }).notNull(),
  qrType: varchar('qr_type', { length: 30 }).notNull(),
  refId: bigint('ref_id', { mode: 'number', unsigned: true }),
  refNo: varchar('ref_no', { length: 50 }),
  parentQrCode: varchar('parent_qr_code', { length: 100 }),
  splitFlag: tinyint('split_flag').default(0),
  splitIndex: int('split_index').default(0),
  batchNo: varchar('batch_no', { length: 50 }),
  materialId: bigint('material_id', { mode: 'number', unsigned: true }),
  materialCode: varchar('material_code', { length: 50 }),
  materialName: varchar('material_name', { length: 100 }),
  specification: varchar('specification', { length: 200 }),
  quantity: decimal('quantity', { precision: 18, scale: 4 }).default('0.0000'),
  unit: varchar('unit', { length: 20 }),
  warehouseId: bigint('warehouse_id', { mode: 'number', unsigned: true }),
  warehouseName: varchar('warehouse_name', { length: 100 }),
  location: varchar('location', { length: 50 }),
  supplierId: bigint('supplier_id', { mode: 'number', unsigned: true }),
  supplierName: varchar('supplier_name', { length: 100 }),
  customerId: bigint('customer_id', { mode: 'number', unsigned: true }),
  customerName: varchar('customer_name', { length: 100 }),
  workOrderId: bigint('work_order_id', { mode: 'number', unsigned: true }),
  workOrderNo: varchar('work_order_no', { length: 50 }),
  productionDate: datetime('production_date'),
  expiryDate: datetime('expiry_date'),
  printCount: int('print_count').default(0),
  lastPrintTime: datetime('last_print_time'),
  scanCount: int('scan_count').default(0),
  lastScanTime: datetime('last_scan_time'),
  status: tinyint('status').default(1),
  extraData: json('extra_data'),
  remark: text('remark'),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  createBy: bigint('create_by', { mode: 'number', unsigned: true }),
  deleted: tinyint('deleted').default(0),
}, (table) => ({
  qrCodeIdx: index('idx_qr_code').on(table.qrCode),
  qrTypeIdx: index('idx_qr_type').on(table.qrType),
  refIdx: index('idx_ref').on(table.qrType, table.refId),
  batchNoIdx: index('idx_batch').on(table.batchNo),
  materialIdx: index('idx_material').on(table.materialId),
}));

export const qrcodeScanLog = mysqlTable('qrcode_scan_log', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  qrCode: varchar('qr_code', { length: 100 }).notNull(),
  qrType: varchar('qr_type', { length: 30 }),
  scanType: varchar('scan_type', { length: 30 }).notNull(),
  refId: bigint('ref_id', { mode: 'number', unsigned: true }),
  refNo: varchar('ref_no', { length: 50 }),
  operatorId: bigint('operator_id', { mode: 'number', unsigned: true }),
  operatorName: varchar('operator_name', { length: 50 }),
  scanResult: varchar('scan_result', { length: 20 }),
  scanMessage: varchar('scan_message', { length: 255 }),
  scanData: json('scan_data'),
  deviceInfo: varchar('device_info', { length: 100 }),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  qrCodeIdx: index('idx_qr_code').on(table.qrCode),
  scanTypeIdx: index('idx_scan_type').on(table.scanType),
  createTimeIdx: index('idx_create_time').on(table.createTime),
}));

export const printLog = mysqlTable('print_log', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  qrId: bigint('qr_id', { mode: 'number', unsigned: true }).notNull(),
  templateId: bigint('template_id', { mode: 'number', unsigned: true }),
  printTime: datetime('print_time').default(sql`CURRENT_TIMESTAMP`),
  operator: varchar('operator', { length: 50 }),
  paperType: varchar('paper_type', { length: 20 }).default('thermal'),
  printCount: int('print_count').default(1),
});

export const labelTemplate = mysqlTable('label_template', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  scenario: varchar('scenario', { length: 30 }).notNull(),
  htmlTemplate: text('html_template').notNull(),
  widthMm: int('width_mm').default(60),
  heightMm: int('height_mm').default(40),
  qrSizeMm: int('qr_size_mm').default(20),
  status: tinyint('status').default(1),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
});

export type QrcodeRecord = typeof qrcodeRecord.$inferSelect;
export type QrcodeScanLog = typeof qrcodeScanLog.$inferSelect;
export type PrintLog = typeof printLog.$inferSelect;
export type LabelTemplate = typeof labelTemplate.$inferSelect;
